import {randomUUID} from "node:crypto";
import type DatabaseConstructor from "better-sqlite3";
import {db,log,emergencyStopActive} from "./storage.js";
import {claimAgentRuntime,refreshAgentHeartbeat,releaseAgentRuntime} from "./agent-runtime.js";
import {chat} from "./llm.js";
import {ensureSandbox,stopSandbox} from "./executor.js";
import {runTool,toolHelp} from "./tools.js";
import {constitutionText} from "./constitution.js";
import {resourceMode} from "./resources.js";
import type {Agent} from "./types.js";

type SqliteDatabase=DatabaseConstructor.Database;
type StoredAgent=Agent & {runtime_owner?:string};
type AgentStarterOptions={staleAfterMs?:number};
type AgentDependencies={
 db:SqliteDatabase;
 getAgent:(id:string)=>StoredAgent|undefined;
 log:(id:string,level:string,message:string)=>void;
 emergencyStopActive:()=>boolean;
 chat:(messages:{role:"system"|"user"|"assistant"|"tool";content:string}[],agentId:string)=>Promise<string>;
 ensureSandbox:(id:string)=>Promise<unknown>;
 stopSandbox:(id:string)=>Promise<unknown>;
 runTool:(id:string,name:string,args:Record<string,unknown>)=>Promise<string>;
 toolHelp:string;
 constitutionText:string;
 resourceMode:()=>string;
 heartbeatIntervalMs?:number;
 delay?:(ms:number)=>Promise<void>;
};

const get=(id:string)=>db.prepare("SELECT * FROM agents WHERE id=?").get(id) as StoredAgent|undefined;

/** Build the production starter with injectable boundaries for deterministic lifecycle tests. */
export function createAgentStarter(deps:AgentDependencies){
 return function startAgent(id:string,options:AgentStarterOptions={}):Promise<void>{
  const agent=deps.getAgent(id);
  if(!agent)throw new Error("Agent not found");
  if(deps.emergencyStopActive())throw new Error("Global emergency stop is active; reset it before starting agents.");
  const owner=process.pid+":"+randomUUID();
  const staleAfterMs=Math.max(30000,options.staleAfterMs??90000);
  if(!claimAgentRuntime(deps.db,id,owner,new Date(),staleAfterMs))throw new Error("Agent already has an active runtime lease.");
  return runAgentLoop(id,owner,deps);
 };
}

const startAgent=createAgentStarter({
 db,getAgent:get,log,emergencyStopActive,chat,ensureSandbox,stopSandbox,runTool,toolHelp,constitutionText,resourceMode
});
export {startAgent};

async function runAgentLoop(id:string,owner:string,deps:AgentDependencies):Promise<void>{
 const heartbeatTimer=setInterval(()=>{refreshAgentHeartbeat(deps.db,id,owner,new Date());},deps.heartbeatIntervalMs??15000);
 heartbeatTimer.unref();
 let history:string[]=[];
 const delay=deps.delay??((ms:number)=>new Promise(r=>setTimeout(r,ms)));
 try{
  await deps.ensureSandbox(id);
  if(deps.emergencyStopActive()){
   deps.db.prepare("UPDATE agents SET status='stopped' WHERE id=? AND runtime_owner=?").run(id,owner);
   await deps.stopSandbox(id);
   return;
  }
  deps.log(id,"system","Agent started");
  while(true){
   const current=deps.getAgent(id);
   if(!current||current.status!=="running"||current.runtime_owner!==owner||deps.emergencyStopActive())break;
   refreshAgentHeartbeat(deps.db,id,owner,new Date());
   const mode=deps.resourceMode();
   const task=deps.db.prepare("SELECT id,title,description,status FROM tasks WHERE agent_id=? AND status IN ('pending','active') ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END,created_at LIMIT 1").get(id) as {id:string;title:string;description:string;status:string}|undefined;
   if(task&&task.status==="pending")deps.db.prepare("UPDATE tasks SET status='active',updated_at=? WHERE id=?").run(new Date().toISOString(),task.id);
   const taskPrompt=task?"\nCurrent task: "+task.title+"\nTask detail: "+task.description+"\nTask ID: "+task.id+"\nPrioritize this task; task status is updated using the CLI.\n":"";
   const prompt="Identity: "+current.name+" ("+id+")\nMission: "+current.goal+"\nResource mode: "+mode+taskPrompt+"\n"+deps.toolHelp+"\nUse exactly one tool per response, format TOOL name JSON on one line, or say DONE and explain progress.\n";
   let answer="";
   try{answer=await deps.chat([{role:"system",content:deps.constitutionText+"\n"+prompt},{role:"user",content:history.slice(-8).join("\n")||"Begin your mission."}],id);}
   catch(e){if(deps.emergencyStopActive())break;deps.log(id,"error",String(e));await delay(15000);continue;}
   const afterResponse=deps.getAgent(id);
   if(!afterResponse||afterResponse.status!=="running"||afterResponse.runtime_owner!==owner||deps.emergencyStopActive())break;
   deps.log(id,"agent",answer);
   if(/^DONE\b/i.test(answer)){if(task)deps.db.prepare("UPDATE tasks SET status='completed',updated_at=? WHERE id=?").run(new Date().toISOString(),task.id);history.push(answer);await delay(60000);continue;}
   const match=answer.match(/^TOOL\s+(shell|read_file|write_file)\s+(\{.*\})/s);
   if(match){try{const result=await deps.runTool(id,match[1],JSON.parse(match[2]));deps.log(id,"tool",result.slice(0,4000));history.push(answer+"\nRESULT: "+result.slice(0,4000));}catch(e){deps.log(id,"error","Tool parse/execution: "+String(e));}}
   else history.push(answer);
   await delay(mode==="CRITICAL"?30000:5000);
  }
 }catch(e){
  deps.db.prepare("UPDATE agents SET status='failed',last_error=? WHERE id=? AND runtime_owner=?").run(String(e).slice(0,1000),id,owner);
  deps.log(id,"error","Agent runtime failed: "+String(e).slice(0,1000));
  throw e;
 }finally{
  clearInterval(heartbeatTimer);
  releaseAgentRuntime(deps.db,id,owner);
  deps.log(id,"system","Agent loop ended.");
 }
}
