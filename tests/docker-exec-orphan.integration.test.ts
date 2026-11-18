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
async function waitForFile(container:string,path:string,timeoutMs=15000):Promise<void>{
 const deadline=Date.now()+timeoutMs;
 while(Date.now()<deadline){
  try{await docker(["exec",container,"test","-f",path]);return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw new Error("Timed out waiting for "+path);
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
   await waitForFile(container,events);
   owner.kill("SIGKILL");
   await waitForExit(owner);

   // A retry starts while the first daemon-side exec may still be running.
   await shell(agentId,command);
   await new Promise(resolve=>setTimeout(resolve,1000));
   const lines=(await docker(["exec",container,"cat",events])).split(/\\r?\\n/).filter(Boolean);
   const starts=lines.filter(line=>line==="started").length;
   const completions=lines.filter(line=>line==="completed").length;

   // Characterization assertion: two starts/completions means the orphan overlapped
   // with a retry. If Docker cancels the first exec, this assertion must be revisited.
   expect({starts,completions}).toEqual({starts:2,completions:2});
  }finally{
   if(owner.exitCode===null&&owner.signalCode===null)owner.kill("SIGKILL");
  }
 },180000);
});
