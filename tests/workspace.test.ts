import {describe,it,expect} from "vitest";
import {normalizeWorkspacePath,WORKSPACE_MAX_FILE_BYTES} from "../src/workspace.js";

describe("read-only workspace path validation",()=>{
 it("normalizes safe relative paths",()=>{
  expect(normalizeWorkspacePath("")).toBe("");
  expect(normalizeWorkspacePath("./src//agent.ts")).toBe("src/agent.ts");
  expect(normalizeWorkspacePath("docs/ROADMAP.md")).toBe("docs/ROADMAP.md");
 });
 it("rejects traversal, absolute paths, backslashes and null bytes",()=>{
  for(const value of ["../secret","src/../../etc/passwd","/etc/passwd","C:\\Windows\\win.ini","src\\agent.ts","bad\0path"]){
   expect(()=>normalizeWorkspacePath(value)).toThrow();
  }
 });
 it("enforces a bounded file preview size",()=>{
  expect(WORKSPACE_MAX_FILE_BYTES).toBe(256*1024);
 });
});
