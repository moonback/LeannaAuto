import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
const dbPath=process.env.AUTOMATON_DB ?? "./data/automaton.db";
fs.mkdirSync(path.dirname(path.resolve(dbPath)),{recursive:true});
export const db=new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY,name TEXT,goal TEXT,parent_id TEXT,status TEXT,created_at TEXT,identity TEXT,constitution_hash TEXT,version TEXT);
CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,at TEXT,level TEXT,message TEXT);
CREATE TABLE IF NOT EXISTS usage(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,at TEXT,cpu_seconds REAL,mem_mb REAL,tokens INTEGER);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(agent_id) REFERENCES agents(id));
CREATE INDEX IF NOT EXISTS tasks_agent_status ON tasks(agent_id,status);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,action TEXT NOT NULL,target TEXT,details TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,agent_id TEXT,task_id TEXT,type TEXT NOT NULL,level TEXT NOT NULL,source TEXT NOT NULL,summary TEXT NOT NULL,details_json TEXT NOT NULL DEFAULT '{}',correlation_id TEXT);
CREATE INDEX IF NOT EXISTS events_at_id ON events(at DESC,id DESC);
CREATE INDEX IF NOT EXISTS events_agent_at ON events(agent_id,at DESC,id DESC);
CREATE INDEX IF NOT EXISTS events_task_at ON events(task_id,at DESC,id DESC);
CREATE INDEX IF NOT EXISTS events_type_at ON events(type,at DESC,id DESC);
CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'events are append-only'); END;
CREATE INDEX IF NOT EXISTS audit_at ON audit(at);
CREATE TABLE IF NOT EXISTS system_state(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO system_state(key,value,updated_at) VALUES('emergency_stop','0',CURRENT_TIMESTAMP);
`);
function migrateColumn(table:string,column:string,definition:string){
 const columns=db.prepare("PRAGMA table_info("+table+")").all() as {name:string}[];
 if(!columns.some(c=>c.name===column))db.exec("ALTER TABLE "+table+" ADD COLUMN "+column+" "+definition);
}
migrateColumn("agents","heartbeat_at","TEXT");
migrateColumn("agents","restart_count","INTEGER NOT NULL DEFAULT 0");
migrateColumn("agents","last_error","TEXT");
migrateColumn("agents","runtime_owner","TEXT");
function redactEventText(value:string):string {
 return value
  .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi,"$1[REDACTED]")
  .replace(/((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+/gi,"$1[REDACTED]")
  .replace(/(sk-[A-Za-z0-9_-]{12,})/g,"[REDACTED]");
}

function appendEvent(input:{at:string;agentId:string|null;taskId?:string|null;type:string;level:string;source:string;summary:string;details?:unknown;correlationId?:string|null}) {
 const details=JSON.stringify(input.details??{});
 db.prepare("INSERT INTO events(at,agent_id,task_id,type,level,source,summary,details_json,correlation_id) VALUES(?,?,?,?,?,?,?,?,?)")
  .run(input.at,input.agentId,input.taskId??null,input.type,input.level,input.source,redactEventText(input.summary),redactEventText(details),input.correlationId??null);
}

export type EventMetadata={eventType?:string;source?:string;taskId?:string|null;correlationId?:string|null;details?:unknown};

export function log(agentId:string,level:string,message:string,metadata:EventMetadata={}){
 const at=new Date().toISOString();
 db.prepare("INSERT INTO logs(agent_id,at,level,message) VALUES(?,?,?,?)").run(agentId,at,level,message);
 appendEvent({at,agentId,taskId:metadata.taskId,type:metadata.eventType??"log",level,source:metadata.source??"runtime-log",summary:message,details:metadata.details,correlationId:metadata.correlationId});
}

export function audit(action:string,target:string|null,details:string){
 const at=new Date().toISOString();
 db.prepare("INSERT INTO audit(at,action,target,details) VALUES(?,?,?,?)").run(at,action,target,details);
 appendEvent({at,agentId:null,type:"audit",level:"info",source:"operator-audit",summary:action+": "+details,details:{action,target}});
}

export function emergencyStopActive(){const row=db.prepare("SELECT value FROM system_state WHERE key='emergency_stop'").get() as {value:string}|undefined;return row?.value==="1";}
export function setEmergencyStop(active:boolean){db.prepare("INSERT INTO system_state(key,value,updated_at) VALUES('emergency_stop',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(active?"1":"0",new Date().toISOString());}
