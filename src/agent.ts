import {db,log} from "./storage.js";
import {chat} from "./llm.js";
import {ensureSandbox} from "./executor.js";
import {runTool,toolHelp} from "./tools.js";
import {constitutionText} from "./constitution.js";
import {resourceMode} from "./resources.js";
import type {Agent} from "./types.js";
const get=(id:string)=>db.prepare("SELECT * FROM agents WHERE id=?").get(id) as Agent|undefined;
export async function startAgent(id:string){
 const agent=get(id); if(!agent)throw new Error("Agent not found");
 db.prepare("UPDATE agents SET status='running' WHERE id=?").run(id);
 await ensureSandbox(id); log(id,"system","Agent started");
 let history:string[]=[];
 while(true){
  const current=get(id); if(!current||current.status!=="running")break;
  const mode=resourceMode();
  const prompt="Identity: "+current.name+" ("+id+")\nMission: "+current.goal+"\nResource mode: "+mode+"\n"+toolHelp+"\nUse exactly one tool per response, format TOOL name JSON on one line, or say DONE and explain progress.\n";
  let answer="";
  try{answer=await chat([{role:"system",content:constitutionText+"\n"+prompt},{role:"user",content:history.slice(-8).join("\n")||"Begin your mission."}]);}
  catch(e){log(id,"error",String(e));await delay(15000);continue;}
  log(id,"agent",answer);
  if(/^DONE\b/i.test(answer)){history.push(answer);await delay(60000);continue;}
  const match=answer.match(/^TOOL\s+(shell|read_file|write_file)\s+(\{.*\})/s);
  if(match){try{const result=await runTool(id,match[1],JSON.parse(match[2]));log(id,"tool",result.slice(0,4000));history.push(answer+"\nRESULT: "+result.slice(0,4000));}catch(e){log(id,"error","Tool parse/execution: "+String(e));}}
  else history.push(answer);
  await delay(mode==="CRITICAL"?30000:5000);
 }
 log(id,"system","Agent loop ended.");
}
function delay(ms:number){return new Promise(r=>setTimeout(r,ms));}
