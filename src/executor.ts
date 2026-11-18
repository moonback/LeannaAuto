import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {limits} from "./resources.js";
const execFileAsync=promisify(execFile);
const containerName=(id:string)=> "leanna-"+id.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40);
export async function shell(agentId:string,command:string){
 const name=containerName(agentId);
 // Persistent workspace mount, isolated container, non-root, quotas, no privileged mode.
 const args=["exec",name,"sh","-lc",command];
 try{
  const {stdout,stderr}=await execFileAsync("docker",args,{timeout:limits.timeoutMs,maxBuffer:1024*1024});
  return (stdout+"\\n"+stderr).trim();
 }catch(e:any){return "Command failed: "+String(e.stderr??e.message).slice(0,3000);}
}
export async function ensureSandbox(agentId:string){
 const name=containerName(agentId), image=process.env.DOCKER_IMAGE??"node:22-bookworm-slim";
 try{await execFileAsync("docker",["inspect",name]);return;}
 catch{
  await execFileAsync("docker",["run","-d","--name",name,"--cpus","1","--memory","1g","--pids-limit","64","--network","bridge","--user","1000:1000","--workdir","/workspace","--mount","type=volume,source="+name+"-workspace,target=/workspace",image,"sleep","infinity"],{timeout:30000});
 }
}
export async function stopSandbox(agentId:string){try{await execFileAsync("docker",["stop",containerName(agentId)],{timeout:15000});}catch{}}
