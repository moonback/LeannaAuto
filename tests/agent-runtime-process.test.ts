import Database from "better-sqlite3";
import {spawn} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe,it,expect} from "vitest";

describe("runtime lease process crash recovery",()=>{
 it("recovers a killed runtime through the supervisor cycle without resetting its active task",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"leanna-runtime-crash-"));
  const dbPath=join(directory,"runtime.sqlite");
  const db=new Database(dbPath);
  db.exec("CREATE TABLE agents(id TEXT PRIMARY KEY,status TEXT,runtime_owner TEXT,heartbeat_at TEXT,last_error TEXT,restart_count INTEGER NOT NULL DEFAULT 0); CREATE TABLE system_state(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE tasks(id TEXT PRIMARY KEY,agent_id TEXT,status TEXT); INSERT INTO system_state(key,value) VALUES('emergency_stop','0'); INSERT INTO agents(id,status) VALUES('agent-crash','stopped'); INSERT INTO tasks(id,agent_id,status) VALUES('task-crash','agent-crash','active');");
  db.close();

  const ownerScript=`
   import Database from "better-sqlite3";
   import {claimAgentRuntime} from "./src/agent-runtime.ts";
   const db=new Database(${JSON.stringify(dbPath)});
   if(!claimAgentRuntime(db,"agent-crash","crashed-process-owner",new Date(),90000))process.exit(2);
   console.log("LEASE_ACQUIRED");
   setInterval(()=>{},1000);
  `;
  const owner=spawn(process.execPath,["--import","tsx","--input-type=module","-e",ownerScript],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});

  try{
   await waitForOutput(owner,"LEASE_ACQUIRED");
   owner.kill("SIGKILL");
   await waitForExit(owner);

   const supervisorScript=`
    import Database from "better-sqlite3";
    import {claimAgentRuntime} from "./src/agent-runtime.ts";
    import {recoverStaleAgents} from "./src/supervisor.ts";
    const db=new Database(${JSON.stringify(dbPath)});
    const active=new Map();
    const recovered=recoverStaleAgents(db,active,async(id,options)=>{
     if(!claimAgentRuntime(db,id,"supervisor-process-owner",new Date(Date.now()+120000),options.staleAfterMs))throw new Error("Runtime lease was not reclaimed");
    },90000,new Date(Date.now()+120000));
    if(recovered.length!==1)process.exit(3);
    await Promise.all([...active.values()]);
    console.log("SUPERVISOR_RECOVERY_COMPLETE");
    db.close();
   `;
   const supervisor=spawn(process.execPath,["--import","tsx","--input-type=module","-e",supervisorScript],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});
   await waitForOutput(supervisor,"SUPERVISOR_RECOVERY_COMPLETE");
   await waitForExit(supervisor);

   const resultDb=new Database(dbPath);
   expect(resultDb.prepare("SELECT status,runtime_owner,restart_count FROM agents WHERE id='agent-crash'").get()).toEqual({status:"running",runtime_owner:"supervisor-process-owner",restart_count:1});
   expect((resultDb.prepare("SELECT status FROM tasks WHERE id='task-crash'").get() as {status:string}).status).toBe("active");
   resultDb.close();
  }finally{
   if(owner.exitCode===null&&owner.signalCode===null)owner.kill("SIGKILL");
   rmSync(directory,{recursive:true,force:true});
  }
 });
});

function waitForOutput(child:ReturnType<typeof spawn>,marker:string):Promise<void>{
 return new Promise((resolve,reject)=>{
  let output="";
  const timeout=setTimeout(()=>reject(new Error("Process did not emit "+marker+". Output: "+output)),10000);
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data",(chunk:string)=>{
   output+=chunk;
   if(output.includes(marker)){clearTimeout(timeout);resolve();}
  });
  child.stderr.on("data",(chunk:string)=>{output+=chunk;});
  child.once("error",error=>{clearTimeout(timeout);reject(error);});
  child.once("exit",code=>{
   if(!output.includes(marker)){clearTimeout(timeout);reject(new Error("Process exited before "+marker+" (code "+code+"): "+output));}
  });
 });
}

function waitForExit(child:ReturnType<typeof spawn>):Promise<void>{
 return new Promise((resolve,reject)=>{
  if(child.exitCode!==null||child.signalCode!==null){resolve();return;}
  const timeout=setTimeout(()=>reject(new Error("Child process did not exit after termination.")),10000);
  child.once("exit",()=>{clearTimeout(timeout);resolve();});
  child.once("error",error=>{clearTimeout(timeout);reject(error);});
 });
}
