import Database from "better-sqlite3";
import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import {createAgentStarter} from "../src/agent.js";
import {recoverStaleAgents} from "../src/supervisor.js";

describe("supervisor recovery with the real agent loop",()=>{
 let db:Database;
 beforeEach(()=>{
  db=new Database(":memory:");
  db.exec(`
   CREATE TABLE agents(id TEXT PRIMARY KEY,name TEXT,goal TEXT,parent_id TEXT,status TEXT,created_at TEXT,identity TEXT,constitution_hash TEXT,version TEXT,runtime_owner TEXT,heartbeat_at TEXT,last_error TEXT,restart_count INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE system_state(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT);
   CREATE TABLE tasks(id TEXT PRIMARY KEY,agent_id TEXT,title TEXT,description TEXT,status TEXT,created_at TEXT,updated_at TEXT);
   CREATE TABLE logs(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,at TEXT,level TEXT,message TEXT);
   INSERT INTO system_state(key,value,updated_at) VALUES('emergency_stop','0',CURRENT_TIMESTAMP);
   INSERT INTO agents(id,name,goal,status,runtime_owner,heartbeat_at,restart_count) VALUES('agent-restart','Test agent','Complete its task','running','dead-owner','2026-11-18T00:00:00.000Z',0);
   INSERT INTO tasks(id,agent_id,title,description,status,created_at,updated_at) VALUES('task-restart','agent-restart','Persist task','Do not reset this task','active','2026-11-18T00:00:00.000Z','2026-11-18T00:00:00.000Z');
  `);
 });
 afterEach(()=>{if(db?.open)db.close();});

 it("reclaims a crashed lease and runs the real agent loop without Docker or a live LLM",async()=>{
  const log=vi.fn((id:string,level:string,message:string)=>{
   db.prepare("INSERT INTO logs(agent_id,at,level,message) VALUES(?,?,?,?)").run(id,new Date().toISOString(),level,message);
  });
  const ensureSandbox=vi.fn(async()=> "sandbox-ready");
  const stopSandbox=vi.fn(async()=>undefined);
  const chat=vi.fn(async()=> 'TOOL shell {"command":"true"}');
  const runTool=vi.fn(async()=>{
   db.prepare("UPDATE agents SET status='stopped' WHERE id='agent-restart'").run();
   return "simulated command completed";
  });
  const getAgent=(id:string)=>db.prepare("SELECT * FROM agents WHERE id=?").get(id) as any;
  const startAgent=createAgentStarter({
   db,getAgent,log,emergencyStopActive:()=>false,chat,ensureSandbox,stopSandbox,runTool,
   toolHelp:"test tools",constitutionText:"test constitution",resourceMode:()=>"NORMAL",
   heartbeatIntervalMs:60000,delay:async()=>undefined
  });
  const active=new Map<string,Promise<void>>();
  const attempted=recoverStaleAgents(db,active,startAgent,90000,new Date("2026-11-18T00:10:00.000Z"),log);
  expect(attempted).toEqual(["agent-restart"]);
  await Promise.all([...active.values()]);

  expect(ensureSandbox).toHaveBeenCalledOnce();
  expect(chat).toHaveBeenCalledOnce();
  expect(runTool).toHaveBeenCalledOnce();
  expect(stopSandbox).not.toHaveBeenCalled();
  expect(db.prepare("SELECT status,runtime_owner,heartbeat_at,restart_count FROM agents WHERE id='agent-restart'").get()).toMatchObject({
   status:"stopped",runtime_owner:null,heartbeat_at:null,restart_count:1
  });
  expect(db.prepare("SELECT status FROM tasks WHERE id='task-restart'").get()).toEqual({status:"active"});
  expect((db.prepare("SELECT COUNT(*) AS count FROM logs WHERE level='tool'").get() as {count:number}).count).toBe(1);
 });

 it("rejects a second start while the real agent loop still owns its lease",async()=>{
  let announceStarted!:()=>void;
  let unblockChat!:()=>void;
  const enteredChat=new Promise<void>(resolve=>{announceStarted=resolve;});
  const chatGate=new Promise<void>(resolve=>{unblockChat=resolve;});
  const log=vi.fn();
  const getAgent=(id:string)=>db.prepare("SELECT * FROM agents WHERE id=?").get(id) as any;
  const chat=vi.fn(async()=>{
   announceStarted();
   await chatGate;
   db.prepare("UPDATE agents SET status='stopped' WHERE id='agent-restart'").run();
   return "DONE";
  });
  const startAgent=createAgentStarter({
   db,getAgent,log,emergencyStopActive:()=>false,chat,
   ensureSandbox:async()=>undefined,stopSandbox:async()=>undefined,
   runTool:async()=>"",toolHelp:"test tools",constitutionText:"test constitution",
   resourceMode:()=>"NORMAL",heartbeatIntervalMs:60000,delay:async()=>undefined
  });

  const firstRun=startAgent("agent-restart");
  try{
   await enteredChat;
   expect(()=>startAgent("agent-restart")).toThrow("Agent already has an active runtime lease.");
   expect(chat).toHaveBeenCalledOnce();
  }finally{
   unblockChat();
   await firstRun;
  }
  expect(db.prepare("SELECT runtime_owner,heartbeat_at,status FROM agents WHERE id='agent-restart'").get()).toMatchObject({
   runtime_owner:null,heartbeat_at:null,status:"stopped"
  });
 });

});
