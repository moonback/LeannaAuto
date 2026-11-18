import {Readable} from "node:stream";
import type {IncomingMessage} from "node:http";
import {describe,it,expect} from "vitest";
import {createUiToken,hashUiToken,verifyUiToken,storedTokenRole,isAllowedUiHost,isAllowedUiOrigin,isAllowedUiRequest,readJsonBody,tokenRole} from "../src/ui-security.js";

describe("dashboard authentication",()=>{
 it("matches configured tokens without accepting empty secrets",()=>{
  expect(tokenRole("admin-secret","admin-secret","operator-secret")).toBe("admin");
  expect(tokenRole("operator-secret","admin-secret","operator-secret")).toBe("operator");
  expect(tokenRole("","", "")).toBeNull();
  expect(tokenRole("wrong","admin-secret","operator-secret")).toBeNull();
 });
});

describe("secure UI credential storage",()=>{
 it("generates strong tokens and stores only a salted derived hash",()=>{
  const token=createUiToken(),digest=hashUiToken(token);
  expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  expect(digest).not.toContain(token);
  expect(verifyUiToken(token,digest)).toBe(true);
  expect(verifyUiToken("wrong-token",digest)).toBe(false);
  expect(verifyUiToken(token,"invalid")).toBe(false);
 });
 it("uses persisted credentials in preference to environment secrets and supports revocation",()=>{
  const digest=hashUiToken("new-admin-secret"),operatorDigest=hashUiToken("new-operator-secret");
  expect(storedTokenRole("new-admin-secret",{token_hash:digest,revoked:0},undefined,"old-admin","old-operator")).toBe("admin");
  expect(storedTokenRole("old-admin",{token_hash:digest,revoked:0},undefined,"old-admin","old-operator")).toBeNull();
  expect(storedTokenRole("new-operator-secret",undefined,{token_hash:operatorDigest,revoked:0},"old-admin","old-operator")).toBe("operator");
  expect(storedTokenRole("old-operator",undefined,{token_hash:"",revoked:1},"old-admin","old-operator")).toBeNull();
  expect(storedTokenRole("old-admin",{token_hash:"",revoked:1},undefined,"old-admin","old-operator")).toBeNull();
 });
});

describe("dashboard API authorization",()=>{
 it("allows only administrators to read security configuration",()=>{
  expect(isAllowedUiRequest("admin","GET","/api/security")).toBe(true);
  expect(isAllowedUiRequest("operator","GET","/api/security")).toBe(false);
  expect(isAllowedUiRequest("admin","POST","/api/security/tokens")).toBe(true);
  expect(isAllowedUiRequest("operator","POST","/api/security/tokens")).toBe(false);
 });
 it("allows operators to read dashboard data and agent details",()=>{
  expect(isAllowedUiRequest("operator","GET","/api/dashboard")).toBe(true);
  expect(isAllowedUiRequest("operator","GET","/api/resources")).toBe(true);
  expect(isAllowedUiRequest("operator","GET","/api/agents/agent-1")).toBe(true);
  expect(isAllowedUiRequest("operator","GET","/api/agents/agent-1/workspace")).toBe(true);
  expect(isAllowedUiRequest("operator","GET","/api/agents/agent-1/workspace/file")).toBe(true);
 });
 it("allows operators only the intended operational writes",()=>{
  expect(isAllowedUiRequest("operator","POST","/api/tasks")).toBe(true);
  expect(isAllowedUiRequest("operator","POST","/api/agents/agent-1/start")).toBe(true);
  expect(isAllowedUiRequest("operator","POST","/api/agents/agent-1/stop")).toBe(true);
  expect(isAllowedUiRequest("operator","POST","/api/agents")).toBe(false);
  expect(isAllowedUiRequest("operator","POST","/api/emergency-stop")).toBe(false);
 });
 it("restricts administrative writes to administrators",()=>{
  expect(isAllowedUiRequest("admin","POST","/api/agents")).toBe(true);
  expect(isAllowedUiRequest("admin","POST","/api/emergency-stop")).toBe(true);
  expect(isAllowedUiRequest("admin","POST","/api/emergency-stop/reset")).toBe(true);
 });
 it("allows agent lifecycle writes only to administrators and denies unlisted routes by default",()=>{
  expect(isAllowedUiRequest("admin","PATCH","/api/agents/agent-1")).toBe(true);
  expect(isAllowedUiRequest("admin","DELETE","/api/agents/agent-1")).toBe(true);
  expect(isAllowedUiRequest("admin","PATCH","/api/tasks/task-1")).toBe(true);
  expect(isAllowedUiRequest("admin","DELETE","/api/tasks/task-1")).toBe(true);
  expect(isAllowedUiRequest("admin","PATCH","/api/agents/agent-1/mission")).toBe(true);
  expect(isAllowedUiRequest("admin","DELETE","/api/agents/agent-1/mission")).toBe(true);
  expect(isAllowedUiRequest("operator","PATCH","/api/tasks/task-1")).toBe(false);
  expect(isAllowedUiRequest("operator","DELETE","/api/tasks/task-1")).toBe(false);
  expect(isAllowedUiRequest("operator","PATCH","/api/agents/agent-1/mission")).toBe(false);
  expect(isAllowedUiRequest("operator","DELETE","/api/agents/agent-1/mission")).toBe(false);
  expect(isAllowedUiRequest("operator","PATCH","/api/agents/agent-1")).toBe(false);
  expect(isAllowedUiRequest("operator","DELETE","/api/agents/agent-1")).toBe(false);
  expect(isAllowedUiRequest("operator","POST","/api/unknown")).toBe(false);
  expect(isAllowedUiRequest("operator","GET","/api/audit")).toBe(false);
  expect(isAllowedUiRequest("admin","POST","/api/unknown")).toBe(false);
 });
});

describe("dashboard local origin restrictions",()=>{
 it("accepts only loopback hostnames on the configured port",()=>{
  expect(isAllowedUiHost("127.0.0.1:3000",3000)).toBe(true);
  expect(isAllowedUiHost("localhost:3000",3000)).toBe(true);
  expect(isAllowedUiHost("evil.example:3000",3000)).toBe(false);
  expect(isAllowedUiHost("localhost:4000",3000)).toBe(false);
 });
 it("accepts only matching loopback browser origins",()=>{
  expect(isAllowedUiOrigin("http://localhost:3000",3000)).toBe(true);
  expect(isAllowedUiOrigin("http://127.0.0.1:3000",3000)).toBe(true);
  expect(isAllowedUiOrigin("https://evil.example",3000)).toBe(false);
 });
});

describe("dashboard JSON body limits",()=>{
 it("parses JSON objects",async()=>{
  const req=Readable.from(['{"ok":true}']) as unknown as IncomingMessage;
  await expect(readJsonBody(req,100)).resolves.toEqual({ok:true});
 });
 it("rejects oversized request bodies",async()=>{
  const req=Readable.from(['{"payload":"too large"}']) as unknown as IncomingMessage;
  await expect(readJsonBody(req,8)).rejects.toThrow("BODY_TOO_LARGE");
 });
 it("rejects arrays and primitive JSON payloads",async()=>{
  const req=Readable.from(['[1,2,3]']) as unknown as IncomingMessage;
  await expect(readJsonBody(req,100)).rejects.toThrow("JSON_OBJECT_REQUIRED");
 });
});
