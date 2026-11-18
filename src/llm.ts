import "dotenv/config";
import type {LLMMessage} from "./types.js";
import {db,log} from "./storage.js";

export async function chat(messages:LLMMessage[],agentId="unknown"){
 const quota=Math.max(0,Number(process.env.INFERENCE_QUOTA??100000));
 const used=(db.prepare("SELECT COALESCE(SUM(tokens),0) as total FROM usage").get() as {total:number}).total;
 if(used>=quota)throw new Error("Global inference token quota exhausted ("+used+"/"+quota+").");
 const base=process.env.OPENROUTER_BASE_URL??"https://openrouter.ai/api/v1";
 const key=process.env.OPENROUTER_API_KEY??process.env.LLM_API_KEY;
 const model=process.env.OPENROUTER_MODEL??process.env.LLM_MODEL;
 if(!key||!model)throw new Error("Configure OPENROUTER_API_KEY and OPENROUTER_MODEL in .env");
 const headers:Record<string,string>={"Authorization":"Bearer "+key,"Content-Type":"application/json"};
 if(process.env.OPENROUTER_SITE_URL)headers["HTTP-Referer"]=process.env.OPENROUTER_SITE_URL;
 if(process.env.OPENROUTER_APP_NAME)headers["X-Title"]=process.env.OPENROUTER_APP_NAME;
 const response=await fetch(base.replace(/\/$/,"")+"/chat/completions",{method:"POST",headers,body:JSON.stringify({model,messages,temperature:.2})});
 if(!response.ok)throw new Error("OpenRouter HTTP "+response.status+": "+(await response.text()).slice(0,400));
 const data=await response.json() as any;
 const tokens=Math.max(0,Number(data.usage?.total_tokens??0));
 db.prepare("INSERT INTO usage(agent_id,at,cpu_seconds,mem_mb,tokens) VALUES(?,?,?,?,?)").run(agentId,new Date().toISOString(),0,0,tokens);
 log(agentId,"usage","Inference tokens: "+tokens+"; global total: "+(used+tokens)+"/"+quota);
 return String(data.choices?.[0]?.message?.content??"");
}
