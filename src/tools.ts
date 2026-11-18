import {shell} from "./executor.js";
import {checkAction} from "./constitution.js";
export async function runTool(agentId:string,name:string,args:Record<string,unknown>){
 const verdict=checkAction(name,args); if(!verdict.allowed)return "Rejected: "+verdict.reason;
 if(name==="shell")return await shell(agentId,String(args.command??""));
 if(name==="read_file")return await shell(agentId,"cat "+quote(String(args.path??"")));
 if(name==="write_file"){
  const p=String(args.path??""); if(!p.startsWith("/workspace/"))return "Writes are restricted to /workspace.";
  const content=String(args.content??"");
  return await shell(agentId,"mkdir -p "+quote(p.slice(0,p.lastIndexOf("/")))+" && cat > "+quote(p)+" <<'LEANNAAUTO_EOF'\\n"+content+"\\nLEANNAAUTO_EOF");
 }
 return "Unknown tool";
}
function quote(s:string){return "'"+s.replace(/'/g,"'\\''")+"'"}
export const toolHelp=`Available tools:
shell(command): run a command in the agent's isolated Linux container
read_file(path): read a file
write_file(path,content): write only under /workspace
memory_search(query): search this agent's log history
`;
