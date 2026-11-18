import Database from "better-sqlite3";
import {afterEach,describe,it,expect} from "vitest";
import {claimAgentRuntime,refreshAgentHeartbeat,releaseAgentRuntime} from "../src/agent-runtime.js";

describe("agent runtime lease",()=>{
 const db=new Database(":memory:");
 db.exec("CREATE TABLE agents(id TEXT PRIMARY KEY,status TEXT,runtime_owner TEXT,heartbeat_at TEXT,last_error TEXT); CREATE TABLE system_state(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE tasks(id TEXT PRIMARY KEY,agent_id TEXT,status TEXT); INSERT INTO system_state(key,value) VALUES('emergency_stop','0'); INSERT INTO agents(id,status) VALUES('agent-1','stopped'); INSERT INTO tasks(id,agent_id,status) VALUES('task-1','agent-1','active');");
 afterEach(()=>{db.prepare("UPDATE agents SET status='stopped',runtime_owner=NULL,heartbeat_at=NULL,last_error=NULL WHERE id='agent-1'").run();db.prepare("UPDATE tasks SET status='active' WHERE id='task-1'").run();});

 it("claims a stopped agent atomically",()=>{
  expect(claimAgentRuntime(db,"agent-1","owner-a",new Date("2026-11-18T10:00:00.000Z"),90000)).toBe(true);
  expect(db.prepare("SELECT status,runtime_owner FROM agents WHERE id='agent-1'").get()).toEqual({status:"running",runtime_owner:"owner-a"});
 });
 it("refuses to claim an agent with a fresh heartbeat",()=>{
  db.prepare("UPDATE agents SET status='running',runtime_owner='owner-a',heartbeat_at=? WHERE id='agent-1'").run("2026-11-18T10:00:00.000Z");
  expect(claimAgentRuntime(db,"agent-1","owner-b",new Date("2026-11-18T10:00:30.000Z"),90000)).toBe(false);
  expect((db.prepare("SELECT runtime_owner FROM agents WHERE id='agent-1'").get() as {runtime_owner:string}).runtime_owner).toBe("owner-a");
 });
 it("reclaims a stale runtime without resetting its active task or allowing the old owner to mutate the lease",()=>{
  db.prepare("UPDATE agents SET status='running',runtime_owner='owner-a',heartbeat_at=? WHERE id='agent-1'").run("2026-11-18T09:57:00.000Z");
  expect(claimAgentRuntime(db,"agent-1","owner-b",new Date("2026-11-18T10:00:00.000Z"),90000)).toBe(true);
  expect((db.prepare("SELECT runtime_owner FROM agents WHERE id='agent-1'").get() as {runtime_owner:string}).runtime_owner).toBe("owner-b");
  expect((db.prepare("SELECT status FROM tasks WHERE id='task-1'").get() as {status:string}).status).toBe("active");
  expect(refreshAgentHeartbeat(db,"agent-1","owner-a",new Date("2026-11-18T10:00:01.000Z"))).toBe(false);
  expect(releaseAgentRuntime(db,"agent-1","owner-a")).toBe(false);
 });
 it("refuses to claim an agent while the global emergency stop is active",()=>{
  db.prepare("UPDATE system_state SET value='1' WHERE key='emergency_stop'").run();
  expect(claimAgentRuntime(db,"agent-1","owner-a",new Date("2026-11-18T10:00:00.000Z"),90000)).toBe(false);
  db.prepare("UPDATE system_state SET value='0' WHERE key='emergency_stop'").run();
 });
 it("reclaims malformed heartbeat timestamps as stale",()=>{
  db.prepare("UPDATE agents SET status='running',runtime_owner='owner-a',heartbeat_at='invalid-date' WHERE id='agent-1'").run();
  expect(claimAgentRuntime(db,"agent-1","owner-b",new Date("2026-11-18T10:00:00.000Z"),90000)).toBe(true);
 });
 it("refreshes and releases only the current owner lease",()=>{
  claimAgentRuntime(db,"agent-1","owner-a",new Date("2026-11-18T10:00:00.000Z"),90000);
  expect(refreshAgentHeartbeat(db,"agent-1","owner-b",new Date())).toBe(false);
  expect(refreshAgentHeartbeat(db,"agent-1","owner-a",new Date("2026-11-18T10:00:10.000Z"))).toBe(true);
  expect(releaseAgentRuntime(db,"agent-1","owner-b")).toBe(false);
  expect(releaseAgentRuntime(db,"agent-1","owner-a")).toBe(true);
 });
});