import type Database from "better-sqlite3";

export function claimAgentRuntime(db:Database,agentId:string,owner:string,now:Date,staleAfterMs:number):boolean {
 const staleBefore=new Date(now.getTime()-staleAfterMs).toISOString();
 const result=db.prepare("UPDATE agents SET status='running',runtime_owner=?,heartbeat_at=?,last_error=NULL WHERE id=? AND (status!='running' OR heartbeat_at IS NULL OR heartbeat_at<?)")
  .run(owner,now.toISOString(),agentId,staleBefore);
 return result.changes===1;
}

export function refreshAgentHeartbeat(db:Database,agentId:string,owner:string,now:Date):boolean {
 const result=db.prepare("UPDATE agents SET heartbeat_at=? WHERE id=? AND status='running' AND runtime_owner=?")
  .run(now.toISOString(),agentId,owner);
 return result.changes===1;
}

export function releaseAgentRuntime(db:Database,agentId:string,owner:string):boolean {
 const result=db.prepare("UPDATE agents SET runtime_owner=NULL,heartbeat_at=NULL WHERE id=? AND runtime_owner=?")
  .run(agentId,owner);
 return result.changes===1;
}