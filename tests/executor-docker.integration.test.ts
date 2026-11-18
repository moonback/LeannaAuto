import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {randomUUID} from "node:crypto";
import {afterEach,describe,it,expect} from "vitest";
import {ensureSandboxWith} from "../src/executor.js";

const execFileAsync=promisify(execFile);
const enabled=process.env.LEANNAAUTO_DOCKER_INTEGRATION==="1";
const resources:string[]=[];
async function docker(args:string[],timeout=120000):Promise<string>{
 const {stdout}=await execFileAsync("docker",args,{timeout,maxBuffer:1024*1024});
 return stdout.trim();
}

describe.skipIf(!enabled)("real Docker sandbox reconciliation (opt-in)",()=>{
 it("restarts and recreates a sandbox while preserving its workspace and security limits",async()=>{
  const agentId="integration-"+randomUUID();
  const container="leanna-"+agentId;
  const volume=container+"-workspace";
  resources.push(container,volume);
  try{
   await expect(ensureSandboxWith(agentId,docker)).resolves.toBe("created");
   const sentinel="workspace-survives-"+randomUUID();
   await docker(["exec",container,"sh","-lc","printf '%s' '"+sentinel+"' > /workspace/recovery-check.txt"]);
   const config=(await docker(["inspect","-f","{{.HostConfig.NetworkMode}}|{{.HostConfig.ReadonlyRootfs}}|{{.HostConfig.Memory}}|{{.HostConfig.NanoCpus}}|{{.HostConfig.PidsLimit}}",container])).split("|");
   expect(config).toEqual(["none","true","1073741824","1000000000","64"]);

   await docker(["stop",container]);
   await expect(ensureSandboxWith(agentId,docker)).resolves.toBe("started");
   await expect(docker(["exec",container,"cat","/workspace/recovery-check.txt"])).resolves.toBe(sentinel);

   await docker(["rm","-f",container]);
   await expect(ensureSandboxWith(agentId,docker)).resolves.toBe("created");
   await expect(docker(["exec",container,"cat","/workspace/recovery-check.txt"])).resolves.toBe(sentinel);
  }finally{
   await docker(["rm","-f",container]).catch(()=>undefined);
   await docker(["volume","rm",volume]).catch(()=>undefined);
  }
 },180000);
});
