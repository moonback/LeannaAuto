import {describe,it,expect,vi} from "vitest";
import {ensureSandboxWith} from "../src/executor.js";

describe("sandbox reconciliation",()=>{
 it("leaves an existing running container untouched",async()=>{
  const runner=vi.fn(async(_args:string[],_timeout?:number)=> "running");
  await expect(ensureSandboxWith("agent-1",runner)).resolves.toBe("already-running");
  expect(runner).toHaveBeenCalledTimes(1);
  expect(runner.mock.calls[0][0]).toEqual(["inspect","-f","{{.State.Status}}","leanna-agent-1"]);
 });
 it("starts an existing stopped container instead of recreating it",async()=>{
  const runner=vi.fn(async(_args:string[],_timeout?:number)=>"")
   .mockResolvedValueOnce("exited")
   .mockResolvedValueOnce("");
  await expect(ensureSandboxWith("agent-1",runner)).resolves.toBe("started");
  expect(runner).toHaveBeenCalledTimes(2);
  expect(runner.mock.calls[1][0]).toEqual(["start","leanna-agent-1"]);
 });
 it("recreates only a container confirmed missing and keeps its workspace volume",async()=>{
  const missing=Object.assign(new Error("docker inspect failed"),{stderr:"Error: No such object: leanna-agent-1"});
  const runner=vi.fn(async(_args:string[],_timeout?:number)=>"")
   .mockRejectedValueOnce(missing)
   .mockResolvedValueOnce("container-id");
  await expect(ensureSandboxWith("agent-1",runner,"test-image")).resolves.toBe("created");
  const createArgs=runner.mock.calls[1][0];
  expect(createArgs[0]).toBe("run");
  expect(createArgs).toContain("test-image");
  expect(createArgs).toContain("type=volume,source=leanna-agent-1-workspace,target=/workspace");
 });
 it("does not mistake an unavailable Docker daemon for a missing container",async()=>{
  const unavailable=Object.assign(new Error("Docker daemon unavailable"),{stderr:"Cannot connect to the Docker daemon"});
  const runner=vi.fn(async(_args:string[],_timeout?:number)=>"").mockRejectedValue(unavailable);
  await expect(ensureSandboxWith("agent-1",runner)).rejects.toThrow("Docker daemon unavailable");
  expect(runner).toHaveBeenCalledTimes(1);
 });
 it("propagates failure to start an existing container",async()=>{
  const runner=vi.fn(async(_args:string[],_timeout?:number)=>"")
   .mockResolvedValueOnce("exited")
   .mockRejectedValueOnce(new Error("start failed"));
  await expect(ensureSandboxWith("agent-1",runner)).rejects.toThrow("start failed");
  expect(runner).toHaveBeenCalledTimes(2);
 });
});
