import type DatabaseConstructor from "better-sqlite3";
type SqliteDatabase = DatabaseConstructor.Database;

export function claimAgentRuntime(db:SqliteDatabase,agentId:string,owner:string,now:Date,staleAfterMs:number):boolean {
 const staleBefore=new Date(now.getTime()-staleAfterMs).toISOString();
 const result=db.prepare("UPDATE agents SET status='running',runtime_owner=?,heartbeat_at=?,last_error=NULL WHERE id=? AND (status!='running' OR heartbeat_at IS NULL OR datetime(heartbeat_at) IS NULL OR datetime(heartbeat_at)<datetime(?)) AND EXISTS(SELECT 1 FROM system_state WHERE key='emergency_stop' AND value='0')")
  .run(owner,now.toISOString(),agentId,staleBefore);
 return result.changes===1;
}

export function refreshAgentHeartbeat(db:SqliteDatabase,agentId:string,owner:string,now:Date):boolean {
 const result=db.prepare("UPDATE agents SET heartbeat_at=? WHERE id=? AND status='running' AND runtime_owner=?")
  .run(now.toISOString(),agentId,owner);
 return result.changes===1;
}

export function releaseAgentRuntime(db:SqliteDatabase,agentId:string,owner:string):boolean {
 const result=db.prepare("UPDATE agents SET runtime_owner=NULL,heartbeat_at=NULL WHERE id=? AND runtime_owner=?")
  .run(agentId,owner);
 return result.changes===1;
}