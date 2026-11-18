import Database from "better-sqlite3";
import {spawn} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe,it,expect} from "vitest";
import {claimAgentRuntime} from "../src/agent-runtime.js";

describe("runtime lease process crash recovery",()=>{
 it("allows a new process to reclaim a crashed runtime without resetting its active task",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"leanna-runtime-crash-"));
  const dbPath=join(directory,"runtime.sqlite");
  const db=new Database(dbPath);
  db.exec("CREATE TABLE agents(id TEXT PRIMARY KEY,status TEXT,runtime_owner TEXT,heartbeat_at TEXT,last_error TEXT); CREATE TABLE system_state(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE tasks(id TEXT PRIMARY KEY,agent_id TEXT,status TEXT); INSERT INTO system_state(key,value) VALUES('emergency_stop','0'); INSERT INTO agents(id,status) VALUES('agent-crash','stopped'); INSERT INTO tasks(id,agent_id,status) VALUES('task-crash','agent-crash','active');");
  db.close();

  const childScript=`
    import Database from "better-sqlite3";
    import {claimAgentRuntime} from "./src/agent-runtime.ts";
    const db = new Database(${JSON.stringify(dbPath)});
    const acquired = claimAgentRuntime(db, "agent-crash", "child-process-owner", new Date(), 90000);
    if (!acquired) process.exit(2);
    console.log("LEASE_ACQUIRED");
    setInterval(() => {}, 1000);
  `;
  const child=spawn(process.execPath,["--import","tsx","--input-type=module","-e",childScript],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});

  try{
   await new Promise<void>((resolve,reject)=>{
    let output="";
    const timeout=setTimeout(()=>reject(new Error("Child process did not acquire its runtime lease in time. Output: "+output)),10000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data",(chunk:string)=>{
     output+=chunk;
     if(output.includes("LEASE_ACQUIRED")){clearTimeout(timeout);resolve();}
    });
    child.once("error",error=>{clearTimeout(timeout);reject(error);});
    child.once("exit",code=>{clearTimeout(timeout);if(!output.includes("LEASE_ACQUIRED"))reject(new Error("Child exited before acquiring lease (code "+code+"): "+output));});
   });

   child.kill("SIGKILL");
   await new Promise<void>((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error("Killed child process did not exit in time.")),10000);
    child.once("exit",()=>{clearTimeout(timeout);resolve();});
    if(child.exitCode!==null||child.signalCode!==null){clearTimeout(timeout);resolve();}
   });

   const recoveryDb=new Database(dbPath);
   const recovered=claimAgentRuntime(recoveryDb,"agent-crash","supervisor-recovery-owner",new Date(Date.now()+120000),90000);
   expect(recovered).toBe(true);
   expect(recoveryDb.prepare("SELECT status,runtime_owner FROM agents WHERE id='agent-crash'").get()).toEqual({status:"running",runtime_owner:"supervisor-recovery-owner"});
   expect((recoveryDb.prepare("SELECT status FROM tasks WHERE id='task-crash'").get() as {status:string}).status).toBe("active");
   recoveryDb.close();
  }finally{
   if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
   rmSync(directory,{recursive:true,force:true});
  }
 });
});
