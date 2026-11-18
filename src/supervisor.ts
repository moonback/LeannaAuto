import type DatabaseConstructor from "better-sqlite3";
type SqliteDatabase = DatabaseConstructor.Database;

type StartAgent = (id:string,options:{staleAfterMs:number})=>Promise<void>;
type SupervisorLog = (agentId:string,message:string)=>void;

export function recoverStaleAgents(
 db:SqliteDatabase,
 active:Map<string,Promise<void>>,
 startAgent:StartAgent,
 staleAfterMs:number,
 now=new Date(),
 writeLog:SupervisorLog=()=>{},
):string[]{
 const agents=db.prepare("SELECT id,heartbeat_at FROM agents WHERE status='running'").all() as {id:string;heartbeat_at:string|null}[];
 const attempted:string[]=[];
 for(const agent of agents){
  if(active.has(agent.id))continue;
  const heartbeat=agent.heartbeat_at?Date.parse(agent.heartbeat_at):Number.NaN;
  const age=Number.isFinite(heartbeat)?now.getTime()-heartbeat:Number.POSITIVE_INFINITY;
  if(age<=staleAfterMs)continue;
  const changed=db.prepare("UPDATE agents SET restart_count=restart_count+1,last_error=? WHERE id=? AND status='running' AND (heartbeat_at IS NULL OR datetime(heartbeat_at) IS NULL OR datetime(heartbeat_at)<datetime(?))")
   .run("Supervisor reclaim: stale heartbeat",agent.id,new Date(now.getTime()-staleAfterMs).toISOString());
  if(changed.changes!==1)continue;
  attempted.push(agent.id);
  writeLog(agent.id,"Stale heartbeat detected; attempting atomic runtime recovery");
  const task=Promise.resolve().then(()=>startAgent(agent.id,{staleAfterMs})).catch(error=>{
   writeLog(agent.id,"Runtime recovery failed: "+String(error).slice(0,1000));
  }).finally(()=>active.delete(agent.id));
  active.set(agent.id,task);
 }
 return attempted;
}
