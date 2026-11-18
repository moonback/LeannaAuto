import {describe,it,expect} from "vitest";
import {isAllowedUiHost,isAllowedUiOrigin,isAllowedUiRequest,tokenRole} from "../src/ui-security.js";

describe("dashboard authentication",()=>{
 it("matches configured tokens without accepting empty secrets",()=>{
  expect(tokenRole("admin-secret","admin-secret","operator-secret")).toBe("admin");
  expect(tokenRole("operator-secret","admin-secret","operator-secret")).toBe("operator");
  expect(tokenRole("","", "")).toBeNull();
  expect(tokenRole("wrong","admin-secret","operator-secret")).toBeNull();
 });
});

describe("dashboard API authorization",()=>{
 it("allows operators to read dashboard data and agent details",()=>{
  expect(isAllowedUiRequest("operator","GET","/api/dashboard")).toBe(true);
  expect(isAllowedUiRequest("operator","GET","/api/agents/agent-1")).toBe(true);
  expect(isAllowedUiRequest("operator","GET","/api/agents/agent-1/workspace")).toBe(true);
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
 it("denies unlisted routes and methods by default",()=>{
  expect(isAllowedUiRequest("admin","DELETE","/api/agents/agent-1")).toBe(false);
  expect(isAllowedUiRequest("operator","POST","/api/unknown")).toBe(false);
  expect(isAllowedUiRequest("operator","GET","/api/audit")).toBe(false);
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
