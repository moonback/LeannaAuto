import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {limits} from "./resources.js";
const execFileAsync=promisify(execFile);
const containerName=(id:string)=> "leanna-"+id.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40);

type DockerRunner=(args:string[],timeoutMs?:number)=>Promise<string>;
async function runDocker(args:string[],timeoutMs=30000):Promise<string>{
 const {stdout}=await execFileAsync("docker",args,{timeout:timeoutMs,maxBuffer:1024*1024});
 return stdout;
}
function isMissingContainer(error:unknown):boolean{
 const value=error as {stderr?:Buffer|string;message?:string};
 const detail=String(value?.stderr??"")+" "+String(value?.message??error);
 return /no such (object|container)/i.test(detail);
}

export async function shell(agentId:string,command:string){
 const name=containerName(agentId);
 try{
  // Keep the lock inside the persistent workspace: a surviving shell process
  // retains the kernel flock after its Node/docker CLI owner is killed.
  const {stdout,stderr}=await execFileAsync("docker",[
   "exec","--user","1000:1000",name,
   "sh","-lc",'flock -x /workspace/.leanna-shell.lock sh -lc "$1"',
   "leanna-shell",command
  ],{timeout:limits.timeoutMs,maxBuffer:1024*1024});
  return (stdout+"\n"+stderr).trim();
 }catch(e:any){return "Command failed: "+String(e.stderr??e.message).slice(0,3000);}
}

/** Reconcile a persisted sandbox with Docker. Only a confirmed missing container is recreated. */
export async function ensureSandboxWith(agentId:string,runner:DockerRunner,image="node:22-bookworm-slim"):Promise<"already-running"|"started"|"created">{
 const name=containerName(agentId);
 try{
  const status=(await runner(["inspect","-f","{{.State.Status}}",name],10000)).trim();
  if(status==="running")return "already-running";
  await runner(["start",name],30000);
  return "started";
 }catch(error){
  if(!isMissingContainer(error))throw error;
  await runner(["run","-d","--name",name,"--cpus","1","--memory","1g","--pids-limit","64","--network","none","--cap-drop","ALL","--security-opt","no-new-privileges:true","--read-only","--tmpfs","/tmp:rw,nosuid,nodev,size=64m","--workdir","/workspace","--mount","type=volume,source="+name+"-workspace,target=/workspace",image,"sh","-lc","mkdir -p /workspace && chmod 777 /workspace && sleep infinity"],30000);
  return "created";
 }
}
export async function ensureSandbox(agentId:string){
 return ensureSandboxWith(agentId,runDocker,process.env.DOCKER_IMAGE??"node:22-bookworm-slim");
}
export async function stopSandbox(agentId:string){try{await execFileAsync("docker",["stop",containerName(agentId)],{timeout:15000});}catch{}}
