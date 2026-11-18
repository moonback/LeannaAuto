import {shell} from "./executor.js";
import {checkAction} from "./constitution.js";
import path from "node:path";
import {log} from "./storage.js";
import type {EventMetadata} from "./storage.js";
export async function runTool(agentId:string,name:string,args:Record<string,unknown>,context:Pick<EventMetadata,"taskId"|"correlationId">={}){
 const verdict=checkAction(name,args); log(agentId,"decision","Tool "+name+" "+(verdict.allowed?"allowed":"rejected")+": "+verdict.reason,{eventType:"tool_decision",source:"tool-router",taskId:context.taskId,correlationId:context.correlationId,details:{tool:name,allowed:verdict.allowed,reason:verdict.reason}}); if(!verdict.allowed)return "Rejected: "+verdict.reason;
 if(name==="shell")return await shell(agentId,String(args.command??""));
 if(name==="read_file"){
  const p=workspacePath(String(args.path??""));
  if(!p)return "Path restricted to workspace.";
  return await shell(agentId,"cat "+quote(p));
 }
 if(name==="write_file"){
  const p=workspacePath(String(args.path??"")); if(!p)return "Path restricted to workspace.";
  const content=String(args.content??"");
  return await shell(agentId,"mkdir -p "+quote(path.posix.dirname(p))+" && cat > "+quote(p)+" <<'LEANNAAUTO_EOF'\n"+content+"\nLEANNAAUTO_EOF");
 }
 return "Unknown tool";
}
function workspacePath(p:string){const n=path.posix.normalize(p.startsWith("/")?p:"/workspace/"+p);return n.startsWith("/workspace/")?n:null;}
function quote(s:string){return "'"+s.replace(/'/g,"'\\''")+"'"}
export const toolHelp=`Available tools:
shell(command): run a command in the agent's isolated Linux container
read_file(path): read a file inside /workspace
write_file(path,content): write only under /workspace
`;
