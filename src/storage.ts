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
`);
function migrateColumn(table:string,column:string,definition:string){
 const columns=db.prepare("PRAGMA table_info("+table+")").all() as {name:string}[];
 if(!columns.some(c=>c.name===column))db.exec("ALTER TABLE "+table+" ADD COLUMN "+column+" "+definition);
}
migrateColumn("agents","heartbeat_at","TEXT");
migrateColumn("agents","restart_count","INTEGER NOT NULL DEFAULT 0");
migrateColumn("agents","last_error","TEXT");
export function log(agentId:string,level:string,message:string){db.prepare("INSERT INTO logs(agent_id,at,level,message) VALUES(?,?,?,?)").run(agentId,new Date().toISOString(),level,message);}
