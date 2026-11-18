import "dotenv/config";
import type {LLMMessage} from "./types.js";
export async function chat(messages:LLMMessage[]){
 const base=process.env.LLM_BASE_URL, key=process.env.LLM_API_KEY, model=process.env.LLM_MODEL;
 if(!base||!key||!model)throw new Error("Configure LLM_BASE_URL, LLM_API_KEY and LLM_MODEL in .env");
 const response=await fetch(base.replace(/\\/$/,"")+"/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages,temperature:.2})});
 if(!response.ok)throw new Error("LLM HTTP "+response.status+": "+(await response.text()).slice(0,400));
 const data=await response.json() as any;
 return String(data.choices?.[0]?.message?.content??"");
}
