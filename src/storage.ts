import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
const dbPath=process.env.AUTOMATON_DB ?? "./data/automaton.db";
fs.mkdirSync(path.dirname(path.resolve(dbPath)),{recursive:true});
export const db=new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY,name TEXT,goal TEXT,parent_id TEXT,status TEXT,created_at TEXT,identity TEXT,constitution_hash TEXT,version TEXT);
CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,at TEXT,level TEXT,message TEXT);
CREATE TABLE IF NOT EXISTS usage(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,at TEXT,cpu_seconds REAL,mem_mb REAL,tokens INTEGER);
`);
export function log(agentId:string,level:string,message:string){db.prepare("INSERT INTO logs(agent_id,at,level,message) VALUES(?,?,?,?)").run(agentId,new Date().toISOString(),level,message);}
