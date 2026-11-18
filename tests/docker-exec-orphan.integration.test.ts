import {spawn,execFile} from "node:child_process";
import {promisify} from "node:util";
import {randomUUID} from "node:crypto";
import {afterEach,describe,it,expect} from "vitest";
import {ensureSandboxWith,shell} from "../src/executor.js";

const execFileAsync=promisify(execFile);
const enabled=process.env.LEANNAAUTO_DOCKER_INTEGRATION==="1";
async function docker(args:string[],timeoutMs=120000):Promise<string>{
 const {stdout}=await execFileAsync("docker",args,{timeout:timeoutMs,maxBuffer:1024*1024});
 return stdout.trim();
}
async function waitForContent(container:string,path:string,expected:string,timeoutMs=15000):Promise<string>{
 const deadline=Date.now()+timeoutMs;
 let lastContent="";
 while(Date.now()<deadline){
  try{
   lastContent=await docker(["exec",container,"cat",path]);
   if(lastContent.includes(expected))return lastContent;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw new Error("Timed out waiting for "+JSON.stringify(expected)+" in "+path+". Last content: "+JSON.stringify(lastContent));
}
function waitForExit(child:ReturnType<typeof spawn>):Promise<void>{
 return new Promise((resolve,reject)=>{
  if(child.exitCode!==null||child.signalCode!==null){resolve();return;}
  const timer=setTimeout(()=>reject(new Error("Child process did not exit after SIGKILL.")),10000);
  child.once("exit",()=>{clearTimeout(timer);resolve();});
  child.once("error",error=>{clearTimeout(timer);reject(error);});
 });
}

describe.skipIf(!enabled)("Docker exec orphan characterization (opt-in)",()=>{
 let container="";
 let volume="";
 afterEach(async()=>{
  if(container)await docker(["rm","-f",container]).catch(()=>undefined);
  if(volume)await docker(["volume","rm",volume]).catch(()=>undefined);
 });

 it("detects whether a docker exec command survives its Node owner and overlaps a retry",async()=>{
  const agentId="orphan-"+randomUUID();
  container="leanna-"+agentId.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40);
  volume=container+"-workspace";
  await expect(ensureSandboxWith(agentId,docker)).resolves.toBe("created");

  const events="/workspace/orphan-events-"+randomUUID()+".txt";
  const command="echo started >> "+events+"; sleep 4; echo completed >> "+events;
  const childScript=`
   import {shell} from "./src/executor.ts";
   await shell(${JSON.stringify(agentId)},${JSON.stringify(command)});
  `;
  const owner=spawn(process.execPath,["--import","tsx","--input-type=module","-e",childScript],{
   cwd:process.cwd(),stdio:"ignore"
  });
  try{
   const beforeCrash=await waitForContent(container,events,"started");
   owner.kill("SIGKILL");
   await waitForExit(owner);

   // Retry immediately while the original command may still be running in Docker.
   const retryResult=await shell(agentId,command);
   expect(retryResult).not.toMatch(/^Command failed:/);
   await new Promise(resolve=>setTimeout(resolve,1000));
   const rawLines=await docker(["exec",container,"cat",events]);
   const lines=rawLines.split(/\r?\n/).filter(Boolean);
   expect(lines).toContain("started");
   expect(lines).toContain("completed");
   console.log("Docker exec orphan characterization:",JSON.stringify({beforeCrash,lines}));
   const starts=lines.filter(line=>line==="started").length;
   const completions=lines.filter(line=>line==="completed").length;

   // One execution means the original was cancelled; two means it survived and
   // overlapped with the retry. Both are valid characterization outcomes.
   expect(starts).toBeGreaterThanOrEqual(1);
   expect(completions).toBeGreaterThanOrEqual(1);
   expect(starts).toBeLessThanOrEqual(2);
   expect(completions).toBeLessThanOrEqual(2);
  }finally{
   if(owner.exitCode===null&&owner.signalCode===null)owner.kill("SIGKILL");
  }
 },180000);
});
