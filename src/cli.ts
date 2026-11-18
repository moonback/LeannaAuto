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
 const createdAt=new Date().toISOString();
 const identity=createIdentity();
 db.prepare("INSERT INTO agents(id,name,goal,parent_id,status,created_at,identity,constitution_hash,version) VALUES(?,?,?,?,?,?,?,?,?)").run(id,opts.name,opts.goal,opts.parent??null,"stopped",createdAt,identity,constitutionHash(),"0.1.0");
 log(id,"genesis","Mission: "+opts.goal);
 console.log(JSON.stringify({id,name:opts.name,identity,goal:opts.goal},null,2));
});
program.command("start").argument("<id>").action(async(id)=>{await startAgent(id);});
program.command("status").argument("<id>").action((id)=>{
 const a=db.prepare("SELECT * FROM agents WHERE id=?").get(id);if(!a){console.error("Not found");process.exitCode=1;return;}console.log(JSON.stringify(a,null,2));
});
program.command("resources").argument("<id>").action(async(id)=>{
 try{const {execFileSync}=await import("node:child_process");console.log(execFileSync("docker",["stats","--no-stream","leanna-"+id.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40)],{encoding:"utf8"}));}catch{console.log("Sandbox not running or stats unavailable.");}
});
program.command("logs").argument("<id>").option("--tail <n>","number of rows","50").option("--follow").action(async(id,opts)=>{
 const show=()=>{const rows=db.prepare("SELECT at,level,message FROM logs WHERE agent_id=? ORDER BY id DESC LIMIT ?").all(id,Number(opts.tail)) as any[];console.log(rows.reverse().map(r=>`[${r.at}] ${r.level}: ${r.message}`).join("\\n"));};
 show();if(opts.follow){while(true){await new Promise(r=>setTimeout(r,3000));show();}}
});
program.command("stop").argument("<id>").action(async(id)=>{
 db.prepare("UPDATE agents SET status='stopped' WHERE id=?").run(id);await stopSandbox(id);log(id,"system","Stopped by CLI");console.log("Stopped "+id);
});
program.command("identity").argument("<id>").action((id)=>{const a=db.prepare("SELECT id,name,identity,constitution_hash,parent_id,version FROM agents WHERE id=?").get(id);console.log(JSON.stringify(a??{},null,2));});
program.command("spawn").argument("<parent>").requiredOption("--goal <goal>").action((parent,opts)=>{
 const p=db.prepare("SELECT * FROM agents WHERE id=?").get(parent) as any;if(!p)throw new Error("Parent not found");
 const id="child-"+randomUUID().slice(0,8);
 db.prepare("INSERT INTO agents(id,name,goal,parent_id,status,created_at,identity,constitution_hash,version) VALUES(?,?,?,?,?,?,?,?,?)").run(id,"Child of "+p.name,opts.goal,parent,"stopped",new Date().toISOString(),createIdentity(),constitutionHash(),"0.1.0");
 log(parent,"lineage","Created child "+id+" (stopped; start separately)");
 log(id,"genesis","Parent "+parent+"; mission: "+opts.goal);
 console.log("Created "+id);
});
program.parseAsync(process.argv);
