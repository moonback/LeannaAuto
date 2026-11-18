import Database from "better-sqlite3";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {randomUUID} from "node:crypto";
import {afterEach,describe,it,expect} from "vitest";
import {createAgentStarter} from "../src/agent.js";
import {ensureSandboxWith,shell} from "../src/executor.js";

const execFileAsync=promisify(execFile);
const enabled=process.env.LEANNAAUTO_DOCKER_INTEGRATION==="1";
async function docker(args:string[],timeoutMs=120000):Promise<string>{
 const {stdout}=await execFileAsync("docker",args,{timeout:timeoutMs,maxBuffer:1024*1024});
 return stdout.trim();
}

describe.skipIf(!enabled)("real agent loop with a real Docker sandbox (opt-in)",()=>{
 let db:Database|undefined;
 let container="";
 let volume="";
 afterEach(async()=>{
  if(container)await docker(["rm","-f",container]).catch(()=>undefined);
  if(volume)await docker(["volume","rm",volume]).catch(()=>undefined);
  if(db?.open)db.close();
 });

 it("runs a model-directed shell tool in Docker and releases the runtime lease",async()=>{
  const agentId="e2e-"+randomUUID();
  container="leanna-"+agentId.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40);
  volume=container+"-workspace";
  db=new Database(":memory:");
  db.exec(`
   CREATE TABLE agents(id TEXT PRIMARY KEY,name TEXT,goal TEXT,parent_id TEXT,status TEXT,created_at TEXT,identity TEXT,constitution_hash TEXT,version TEXT,runtime_owner TEXT,heartbeat_at TEXT,last_error TEXT,restart_count INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE system_state(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT);
   CREATE TABLE tasks(id TEXT PRIMARY KEY,agent_id TEXT,title TEXT,description TEXT,status TEXT,created_at TEXT,updated_at TEXT);
   CREATE TABLE logs(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,at TEXT,level TEXT,message TEXT);
   INSERT INTO system_state(key,value,updated_at) VALUES('emergency_stop','0',CURRENT_TIMESTAMP);
  `);
  db.prepare("INSERT INTO agents(id,name,goal,status) VALUES(?,?,?,'running')").run(agentId,"Docker integration agent","Write a marker in its workspace");
  const marker="agent-docker-"+randomUUID();
  const startAgent=createAgentStarter({
   db,
   getAgent:(id:string)=>db!.prepare("SELECT * FROM agents WHERE id=?").get(id) as any,
   log:(id,level,message)=>db!.prepare("INSERT INTO logs(agent_id,at,level,message) VALUES(?,?,?,?)").run(id,new Date().toISOString(),level,message),
   emergencyStopActive:()=>false,
   chat:async()=>'TOOL shell '+JSON.stringify({command:"printf '%s' '"+marker+"' > /workspace/agent-e2e.txt"}),
   ensureSandbox:async(id)=>ensureSandboxWith(id,docker),
   stopSandbox:async(id)=>docker(["stop","leanna-"+id.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40)]),
   runTool:async(id,name,args)=>{
    if(name!=="shell"||typeof args.command!=="string")throw new Error("Unexpected tool request");
    const result=await shell(id,args.command);
    if(result.startsWith("Command failed:"))throw new Error(result);
    db!.prepare("UPDATE agents SET status='stopped' WHERE id=?").run(id);
    return result||"Command completed";
   },
   toolHelp:"shell(command)",
   constitutionText:"Test-only constitution",
   resourceMode:()=>"NORMAL",
   heartbeatIntervalMs:60000,
   delay:async()=>undefined
  });

  await startAgent(agentId);
  await expect(docker(["exec",container,"cat","/workspace/agent-e2e.txt"])).resolves.toBe(marker);
  expect(db.prepare("SELECT status,runtime_owner,heartbeat_at FROM agents WHERE id=?").get(agentId)).toMatchObject({
   status:"stopped",runtime_owner:null,heartbeat_at:null
  });
  expect(db.prepare("SELECT level,message FROM logs WHERE agent_id=? AND level='tool'").all(agentId)).toHaveLength(1);
  const config=(await docker(["inspect","-f","{{.HostConfig.NetworkMode}}|{{.HostConfig.ReadonlyRootfs}}|{{.HostConfig.Memory}}|{{.HostConfig.NanoCpus}}|{{.HostConfig.PidsLimit}}",container])).split("|");
  expect(config).toEqual(["none","true","1073741824","1000000000","64"]);
 },180000);
});
