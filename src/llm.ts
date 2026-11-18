import "dotenv/config";
import type {LLMMessage} from "./types.js";
export async function chat(messages:LLMMessage[]){
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
 return String(data.choices?.[0]?.message?.content??"");
}
