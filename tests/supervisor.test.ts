import Database from "better-sqlite3";
import {describe,it,expect,vi} from "vitest";
import {recoverStaleAgents} from "../src/supervisor.js";

describe("supervisor recovery cycle",()=>{
 it("only schedules stale runtimes and increments their restart count once",async()=>{
  const db=new Database(":memory:");
  db.exec("CREATE TABLE agents(id TEXT PRIMARY KEY,status TEXT,heartbeat_at TEXT,restart_count INTEGER NOT NULL DEFAULT 0,last_error TEXT);");
  db.prepare("INSERT INTO agents(id,status,heartbeat_at) VALUES(?,?,?)").run("fresh","running","2026-11-18T10:00:50.000Z");
  db.prepare("INSERT INTO agents(id,status,heartbeat_at) VALUES(?,?,?)").run("stale","running","2026-11-18T09:58:00.000Z");
  db.prepare("INSERT INTO agents(id,status,heartbeat_at) VALUES(?,?,?)").run("malformed","running","not-a-date");
  const active=new Map<string,Promise<void>>();
  const startAgent=vi.fn(async()=>{});
  const now=new Date("2026-11-18T10:00:00.000Z");

  const attempted=recoverStaleAgents(db,active,startAgent,90000,now);
  expect([...attempted].sort()).toEqual(["malformed","stale"]);
  expect(startAgent).not.toHaveBeenCalled();
  await Promise.all([...active.values()]);
  expect(startAgent).toHaveBeenCalledTimes(2);
  expect((db.prepare("SELECT restart_count FROM agents WHERE id='fresh'").get() as {restart_count:number}).restart_count).toBe(0);
  expect((db.prepare("SELECT restart_count FROM agents WHERE id='stale'").get() as {restart_count:number}).restart_count).toBe(1);
  expect((db.prepare("SELECT restart_count FROM agents WHERE id='malformed'").get() as {restart_count:number}).restart_count).toBe(1);
  expect(active.size).toBe(0);
  db.close();
 });

 it("does not schedule a second recovery while the same agent is already active",async()=>{
  const db=new Database(":memory:");
  db.exec("CREATE TABLE agents(id TEXT PRIMARY KEY,status TEXT,heartbeat_at TEXT,restart_count INTEGER NOT NULL DEFAULT 0,last_error TEXT); INSERT INTO agents(id,status,heartbeat_at) VALUES('agent','running','2026-11-18T09:00:00.000Z');");
  const active=new Map<string,Promise<void>>();
  let finish!:()=>void;
  const pending=new Promise<void>(resolve=>{finish=resolve;});
  const startAgent=vi.fn(()=>pending);
  const now=new Date("2026-11-18T10:00:00.000Z");

  expect(recoverStaleAgents(db,active,startAgent,90000,now)).toEqual(["agent"]);
  expect(recoverStaleAgents(db,active,startAgent,90000,now)).toEqual([]);
  expect(startAgent).toHaveBeenCalledTimes(0);
  await Promise.resolve();
  expect(startAgent).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([...active.values()]);
  expect(active.size).toBe(0);
  db.close();
 });
});
