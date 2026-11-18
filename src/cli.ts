import "dotenv/config";
import {Command} from "commander";
import {randomUUID} from "node:crypto";
import {db,log} from "./storage.js";
import {createIdentity,constitutionHash} from "./identity.js";
import {startAgent} from "./agent.js";
import {stopSandbox} from "./executor.js";
const program=new Command();
program.name("automaton").description("LeannaAuto autonomous agents");
program.command("init").requiredOption("--name <name>").requiredOption("--goal <goal>").option("--parent <id>").action((opts)=>{
 const id=opts.name.toLowerCase().replace(/[^a-z0-9-]/g,"-")+"-"+randomUUID().slice(0,8);
 const createdAt=new Date().toISOString(),identity=createIdentity();
 db.prepare("INSERT INTO agents(id,name,goal,parent_id,status,created_at,identity,constitution_hash,version) VALUES(?,?,?,?,?,?,?,?,?)").run(id,opts.name,opts.goal,opts.parent??null,"stopped",createdAt,identity,constitutionHash(),"0.1.0");
 log(id,"genesis","Mission: "+opts.goal);console.log(JSON.stringify({id,name:opts.name,identity,goal:opts.goal},null,2));
});
program.command("start").argument("<id>").action(async(id)=>{await startAgent(id);});
program.command("status").argument("<id>").action((id)=>{
 const a=db.prepare("SELECT * FROM agents WHERE id=?").get(id);if(!a){console.error("Not found");process.exitCode=1;return;}console.log(JSON.stringify(a,null,2));
});
program.command("usage").argument("[id]").description("Show recorded inference token usage").action((id)=>{
 const quota=Math.max(0,Number(process.env.INFERENCE_QUOTA??100000));
 if(id){const row=db.prepare("SELECT COALESCE(SUM(tokens),0) as tokens FROM usage WHERE agent_id=?").get(id) as any;console.log(JSON.stringify({agent:id,tokens:row.tokens,globalQuota:quota},null,2));return;}
 const total=(db.prepare("SELECT COALESCE(SUM(tokens),0) as tokens FROM usage").get() as any).tokens;
 const byAgent=db.prepare("SELECT agent_id,SUM(tokens) as tokens FROM usage GROUP BY agent_id ORDER BY tokens DESC").all();
 console.log(JSON.stringify({totalTokens:total,quota,remaining:Math.max(0,quota-total),agents:byAgent},null,2));
});
program.command("resources").argument("<id>").action(async(id)=>{
 try{const {execFileSync}=await import("node:child_process");console.log(execFileSync("docker",["stats","--no-stream","leanna-"+id.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40)],{encoding:"utf8"}));}catch{console.log("Sandbox not running or stats unavailable.");}
});
program.command("logs").argument("<id>").option("--tail <n>","number of rows","50").option("--follow").action(async(id,opts)=>{
 const show=()=>{const rows=db.prepare("SELECT at,level,message FROM logs WHERE agent_id=? ORDER BY id DESC LIMIT ?").all(id,Number(opts.tail)) as any[];console.log(rows.reverse().map(r=>`[${r.at}] ${r.level}: ${r.message}`).join("
"));};
 show();if(opts.follow){while(true){await new Promise(r=>setTimeout(r,3000));show();}}
});
program.command("stop").argument("<id>").action(async(id)=>{
 db.prepare("UPDATE agents SET status='stopped' WHERE id=?").run(id);await stopSandbox(id);log(id,"system","Stopped by CLI");console.log("Stopped "+id);
});
program.command("identity").argument("<id>").action((id)=>{const a=db.prepare("SELECT id,name,identity,constitution_hash,parent_id,version FROM agents WHERE id=?").get(id);console.log(JSON.stringify(a??{},null,2));});
program.command("spawn").argument("<parent>").requiredOption("--goal <goal>").action((parent,opts)=>{
 const p=db.prepare("SELECT * FROM agents WHERE id=?").get(parent) as any;if(!p)throw new Error("Parent not found");
 const maxChildren=Math.max(0,Number(process.env.MAX_CHILDREN_PER_AGENT??3));const childCount=(db.prepare("SELECT COUNT(*) as n FROM agents WHERE parent_id=?").get(parent) as any).n;if(childCount>=maxChildren)throw new Error("Parent child quota reached (MAX_CHILDREN_PER_AGENT).");
 const maxAgents=Math.max(1,Number(process.env.MAX_AGENTS_TOTAL??20));const total=(db.prepare("SELECT COUNT(*) as n FROM agents").get() as any).n;if(total>=maxAgents)throw new Error("Global agent quota reached (MAX_AGENTS_TOTAL).");
 const id="child-"+randomUUID().slice(0,8);
 db.prepare("INSERT INTO agents(id,name,goal,parent_id,status,created_at,identity,constitution_hash,version) VALUES(?,?,?,?,?,?,?,?,?)").run(id,"Child of "+p.name,opts.goal,parent,"stopped",new Date().toISOString(),createIdentity(),constitutionHash(),"0.1.0");
 log(parent,"lineage","Created child "+id+" (stopped; start separately)");log(id,"genesis","Parent "+parent+"; mission: "+opts.goal);console.log("Created "+id);
});
const tasks=program.command("task").description("Manage persistent mission tasks");
tasks.command("add").argument("<agent>").requiredOption("--title <title>").option("--description <description>","").action((agent,opts)=>{
 if(!db.prepare("SELECT id FROM agents WHERE id=?").get(agent))throw new Error("Agent not found");
 const id=randomUUID(),now=new Date().toISOString();
 db.prepare("INSERT INTO tasks(id,agent_id,title,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(id,agent,opts.title,opts.description,"pending",now,now);
 log(agent,"task","Added task "+id+": "+opts.title);console.log(id);
});
tasks.command("list").argument("<agent>").action(agent=>{
 const rows=db.prepare("SELECT id,title,description,status,created_at,updated_at FROM tasks WHERE agent_id=? ORDER BY created_at").all(agent);console.log(JSON.stringify(rows,null,2));
});
tasks.command("set").argument("<taskId>").argument("<status>").action((id,status)=>{
 if(!["pending","active","completed","failed"].includes(status))throw new Error("Status must be pending, active, completed, or failed");
 const t=db.prepare("SELECT agent_id FROM tasks WHERE id=?").get(id) as any;if(!t)throw new Error("Task not found");
 db.prepare("UPDATE tasks SET status=?,updated_at=? WHERE id=?").run(status,new Date().toISOString(),id);log(t.agent_id,"task",id+" => "+status);
});
program.command("supervise").description("Watch and restart agents marked running").option("--interval <seconds>","poll interval","10").option("--stale <seconds>","heartbeat timeout","90").action(async(opts)=>{
 const interval=Math.max(2,Number(opts.interval))*1000,stale=Math.max(30,Number(opts.stale))*1000;
 const active=new Map<string,Promise<void>>();
 console.log("Supervisor active; Ctrl+C to stop.");
 while(true){
  const agents=db.prepare("SELECT id,heartbeat_at FROM agents WHERE status='running'").all() as any[];
  for(const a of agents){
   if(active.has(a.id))continue;
   const age=a.heartbeat_at?Date.now()-Date.parse(a.heartbeat_at):Infinity;
   if(age>stale){db.prepare("UPDATE agents SET restart_count=restart_count+1,last_error=? WHERE id=?").run("Supervisor restart: stale heartbeat",a.id);log(a.id,"supervisor","Heartbeat stale; restarting loop");}
   const p=startAgent(a.id).catch(e=>{log(a.id,"supervisor-error",String(e));db.prepare("UPDATE agents SET last_error=?,status='stopped' WHERE id=?").run(String(e),a.id);}).finally(()=>active.delete(a.id));
   active.set(a.id,p);
  }
  await new Promise(r=>setTimeout(r,interval));
 }
});
program.parseAsync(process.argv);
