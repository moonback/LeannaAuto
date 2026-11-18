import Database from "better-sqlite3";
import {execFile,spawn} from "node:child_process";
import {rmSync} from "node:fs";
import {promisify} from "node:util";
import {randomUUID} from "node:crypto";
import {afterEach,describe,it,expect} from "vitest";
import {createAgentStarter} from "../src/agent.js";
import {recoverStaleAgents} from "../src/supervisor.js";
import {ensureSandboxWith,shell} from "../src/executor.js";

const execFileAsync=promisify(execFile);
const enabled=process.env.LEANNAAUTO_DOCKER_INTEGRATION==="1";
async function docker(args:string[],timeoutMs=120000):Promise<string>{
 const {stdout}=await execFileAsync("docker",args,{timeout:timeoutMs,maxBuffer:1024*1024});
 return stdout.trim();
}

describe.skipIf(!enabled)("Docker agent recovery after owner-process crash (opt-in)",()=>{
 let db:Database|undefined;
 let container="";
 let volume="";
 let databasePath="";
 afterEach(async()=>{
  if(container)await docker(["rm","-f",container]).catch(()=>undefined);
  if(volume)await docker(["volume","rm",volume]).catch(()=>undefined);
  if(db?.open)db.close();
  if(databasePath)rmSync(databasePath,{force:true});
 });

 it("reclaims a killed process lease and resumes the active task in the persistent Docker workspace",async()=>{
  const agentId="crash-e2e-"+randomUUID();
  container="leanna-"+agentId.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40);
  volume=container+"-workspace";
  databasePath=process.env.TEMP?process.env.TEMP+"\\leanna-crash-"+randomUUID()+".sqlite":process.cwd()+"\\.leanna-crash-"+randomUUID()+".sqlite";
  const testDb=new Database(databasePath);
  db=testDb;
  testDb.exec(`
   CREATE TABLE agents(id TEXT PRIMARY KEY,name TEXT,goal TEXT,parent_id TEXT,status TEXT,created_at TEXT,identity TEXT,constitution_hash TEXT,version TEXT,runtime_owner TEXT,heartbeat_at TEXT,last_error TEXT,restart_count INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE system_state(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT);
   CREATE TABLE tasks(id TEXT PRIMARY KEY,agent_id TEXT,title TEXT,description TEXT,status TEXT,created_at TEXT,updated_at TEXT);
   CREATE TABLE logs(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,at TEXT,level TEXT,message TEXT);
   INSERT INTO system_state(key,value,updated_at) VALUES('emergency_stop','0',CURRENT_TIMESTAMP);
  `);
  testDb.prepare("INSERT INTO agents(id,name,goal,status) VALUES(?,?,?,'stopped')").run(agentId,"Crash recovery agent","Resume an active task after process loss");
  testDb.prepare("INSERT INTO tasks(id,agent_id,title,description,status) VALUES(?,?,?,?, 'active')").run("task-"+agentId,agentId,"Resume Docker work","Write a recovery marker");
  const marker="recovered-"+randomUUID();
  const staleTime=new Date(Date.now()-120000).toISOString();
  const ownerScript=`
   import Database from "better-sqlite3";
   import {claimAgentRuntime} from "./src/agent-runtime.ts";
   const db=new Database(${JSON.stringify(databasePath)});
   const id=${JSON.stringify(agentId)};
   if(!claimAgentRuntime(db,id,"crashed-owner",new Date(Date.now()-120000),30000))process.exit(2);
   db.prepare("UPDATE agents SET heartbeat_at=? WHERE id=?").run(${JSON.stringify(staleTime)},id);
   console.log("CRASH_OWNER_READY");
   setInterval(()=>{},1000);
  `;
  const owner=spawn(process.execPath,["--import","tsx","--input-type=module","-e",ownerScript],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});
  try{
   await waitForOutput(owner,"CRASH_OWNER_READY");
   owner.kill("SIGKILL");
   await waitForExit(owner);

   const startAgent=createAgentStarter({
    db:testDb,
    getAgent:(id:string)=>testDb.prepare("SELECT * FROM agents WHERE id=?").get(id) as any,
    log:(id,level,message)=>testDb.prepare("INSERT INTO logs(agent_id,at,level,message) VALUES(?,?,?,?)").run(id,new Date().toISOString(),level,message),
    emergencyStopActive:()=>false,
    chat:async()=>'TOOL shell '+JSON.stringify({command:"printf '%s' '"+marker+"' > /workspace/crash-recovery.txt"}),
    ensureSandbox:async(id)=>ensureSandboxWith(id,docker),
    stopSandbox:async(id)=>docker(["stop","leanna-"+id.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40)]),
    runTool:async(id,name,args)=>{
     if(name!=="shell"||typeof args.command!=="string")throw new Error("Unexpected tool request");
     const result=await shell(id,args.command);
     if(result.startsWith("Command failed:"))throw new Error(result);
     testDb.prepare("UPDATE agents SET status='stopped' WHERE id=?").run(id);
     return result||"Command completed";
    },
    toolHelp:"shell(command)",
    constitutionText:"Test-only constitution",
    resourceMode:()=>"NORMAL",
    heartbeatIntervalMs:60000,
    delay:async()=>undefined
   });
   const active=new Map<string,Promise<void>>();
   const attempted=recoverStaleAgents(testDb,active,startAgent,30000,new Date());
   expect(attempted).toEqual([agentId]);
   await Promise.all([...active.values()]);

   await expect(docker(["exec",container,"cat","/workspace/crash-recovery.txt"])).resolves.toBe(marker);
   expect(testDb.prepare("SELECT status,runtime_owner,heartbeat_at,restart_count FROM agents WHERE id=?").get(agentId)).toMatchObject({
    status:"stopped",runtime_owner:null,heartbeat_at:null,restart_count:1
   });
   expect(testDb.prepare("SELECT status FROM tasks WHERE id=?").get("task-"+agentId)).toMatchObject({status:"active"});
   expect(testDb.prepare("SELECT level FROM logs WHERE agent_id=? AND level='tool'").all(agentId)).toHaveLength(1);
  }finally{
   if(owner.exitCode===null&&owner.signalCode===null)owner.kill("SIGKILL");
  }
 },180000);
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
