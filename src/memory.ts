import {db,log} from "./storage.js";
export function remember(id:string,message:string){log(id,"memory",message);}
export function searchMemory(id:string,query:string){
 const rows=db.prepare("SELECT at,message FROM logs WHERE agent_id=? AND message LIKE ? ORDER BY id DESC LIMIT 10").all(id,"%"+query+"%") as {at:string,message:string}[];
 return rows.map(r=>r.at+" "+r.message).join("\n")||"No matches.";
}
