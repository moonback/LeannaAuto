import os from "node:os";
import fs from "node:fs";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {limits} from "./resources.js";

const execFileAsync=promisify(execFile);
let previousCpu:{idle:number;total:number}|null=null;

function cpuTotals(){
 const cpus=os.cpus();
 let idle=0,total=0;
 for(const cpu of cpus){
  const times=cpu.times;
  idle+=times.idle;
  total+=times.user+times.nice+times.sys+times.idle+times.irq;
 }
 return {idle,total};
}

function hostCpuPercent():number|null{
 const current=cpuTotals(),previous=previousCpu;
 previousCpu=current;
 if(!previous)return null;
 const total=current.total-previous.total,idle=current.idle-previous.idle;
 if(total<=0||idle<0)return null;
 return Math.round(Math.max(0,Math.min(100,(1-idle/total)*100))*10)/10;
}

function diskMetrics(){
 try{
  const stats=fs.statfsSync(process.cwd());
  const blockSize=Number(stats.bsize);
  const total=Number(stats.blocks)*blockSize;
  const available=Number(stats.bavail)*blockSize;
  if(!Number.isFinite(total)||!Number.isFinite(available)||total<=0)return {available:false,totalBytes:null,freeBytes:null,usedPercent:null};
  return {available:true,totalBytes:total,freeBytes:available,usedPercent:Math.round((total-available)/total*1000)/10};
 }catch{
  return {available:false,totalBytes:null,freeBytes:null,usedPercent:null};
 }
}

function bytesFrom(value:string):number|null{
 const match=value.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(B|KiB|MiB|GiB|TiB)?$/i);
 if(!match)return null;
 const unit=(match[2]??"B").toLowerCase();
 const multiplier=unit==="kib"?1024:unit==="mib"?1024**2:unit==="gib"?1024**3:unit==="tib"?1024**4:1;
 return Number(match[1])*multiplier;
}

function percent(value:string):number|null{
 const parsed=Number.parseFloat(value.replace("%",""));
 return Number.isFinite(parsed)?parsed:null;
}

export async function collectSystemMetrics(){
 const totalMemory=os.totalmem(),freeMemory=os.freemem(),memoryUsed=totalMemory-freeMemory;
 const processMemory=process.memoryUsage();
 const host={
  cpuPercent:hostCpuPercent(),
  cpuCores:os.cpus().length,
  memory:{totalBytes:totalMemory,freeBytes:freeMemory,usedBytes:memoryUsed,usedPercent:totalMemory?Math.round(memoryUsed/totalMemory*1000)/10:null},
  disk:diskMetrics(),
  uptimeSeconds:os.uptime(),
  platform:os.platform(),
  sampledAt:new Date().toISOString()
 };
 const runtime={
  pid:process.pid,
  uptimeSeconds:process.uptime(),
  memory:{rssBytes:processMemory.rss,heapUsedBytes:processMemory.heapUsed,heapTotalBytes:processMemory.heapTotal,externalBytes:processMemory.external}
 };
 let docker:{available:boolean;containers:Array<{name:string;cpuPercent:number|null;memoryUsedBytes:number|null;memoryLimitBytes:number|null;memoryPercent:number|null;pids:number|null}>;reason?:string};
 try{
  const result=await execFileAsync("docker",["stats","--no-stream","--format","{{json .}}"],{timeout:6000,maxBuffer:1024*1024});
  const containers=result.stdout.split(/\r?\n/).filter(Boolean).flatMap(line=>{
   try{
    const row=JSON.parse(line) as Record<string,string>;
    const name=String(row.Name??row.name??"");
    if(!name.startsWith("leanna-"))return [];
    const memory=String(row.MemUsage??"").split("/");
    return [{
     name,
     cpuPercent:percent(String(row.CPUPerc??"")),
     memoryUsedBytes:memory[0]?bytesFrom(memory[0]):null,
     memoryLimitBytes:memory[1]?bytesFrom(memory[1]):null,
     memoryPercent:percent(String(row.MemPerc??"")),
     pids:Number.isFinite(Number(row.PIDs))?Number(row.PIDs):null
    }];
   }catch{return [];}
  });
  docker={available:true,containers};
 }catch{
  docker={available:false,containers:[],reason:"Docker indisponible ou statistiques non accessibles"};
 }
 return {host,runtime,docker,configuredLimits:{cpuCores:limits.cpu,memory:limits.memory,pids:limits.pids,executionTimeoutMs:limits.timeoutMs}};
}
