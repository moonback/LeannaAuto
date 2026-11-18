import {spawn, type ChildProcess} from "node:child_process";
import {createServer} from "node:net";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {afterAll,beforeAll,describe,it,expect} from "vitest";

let child:ChildProcess|undefined;
let baseUrl="";
let directory="";
const adminToken="integration-admin-token";
const operatorToken="integration-operator-token";

async function freePort():Promise<number>{
 const server=createServer();
 await new Promise<void>((resolve,reject)=>server.once("error",reject).listen(0,"127.0.0.1",resolve));
 const address=server.address();
 if(!address||typeof address==="string")throw new Error("Unable to allocate test port");
 const port=address.port;
 await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 return port;
}

async function request(pathname:string,token=operatorToken,init:RequestInit={}):Promise<Response>{
 return fetch(baseUrl+pathname,{...init,headers:{Authorization:"Bearer "+token,...(init.headers??{})}});
}

beforeAll(async()=>{
 directory=await mkdtemp(path.join(tmpdir(),"leanna-ui-http-"));
 const port=await freePort();
 baseUrl="http://127.0.0.1:"+port;
 child=spawn(process.execPath,["--import","tsx","src/ui.ts"],{
  cwd:process.cwd(),
  env:{...process.env,UI_PORT:String(port),AUTOMATON_DB:path.join(directory,"test.db"),LEANNAAUTO_UI_TOKEN:adminToken,LEANNAAUTO_UI_OPERATOR_TOKEN:operatorToken},
  stdio:"ignore"
 });
 let ready=false;
 for(let attempt=0;attempt<100;attempt++){
  if(child.exitCode!==null)throw new Error("Dashboard process exited before becoming ready");
  try{const response=await fetch(baseUrl+"/");if(response.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw new Error("Dashboard did not become ready within 10 seconds");
},15000);

afterAll(async()=>{
 if(child&&!child.killed){
  await new Promise<void>(resolve=>{
   const timeout=setTimeout(resolve,1500);
   child!.once("exit",()=>{clearTimeout(timeout);resolve();});
   child!.kill();
  });
 }
 if(directory)await rm(directory,{recursive:true,force:true});
});

describe("dashboard HTTP security integration",()=>{
 it("authenticates an operator and serves the dashboard",async()=>{
  const response=await request("/api/dashboard");
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({role:"operator"});
 });
 it("rejects privileged writes from an operator",async()=>{
  const response=await request("/api/agents",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"blocked",goal:"must be denied"})});
  expect(response.status).toBe(403);
 });
 it("allows an administrator to create an agent",async()=>{
  const response=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"integration-agent",goal:"HTTP integration test"})});
  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toHaveProperty("id");
 });
 it("rejects non-JSON write requests",async()=>{
  const response=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"text/plain"},body:"not-json"});
  expect(response.status).toBe(415);
 });
 it("rejects untrusted Host and Origin headers",async()=>{
  const hostResponse=await fetch(baseUrl+"/api/dashboard",{headers:{Host:"evil.example:3000",Authorization:"Bearer "+operatorToken}});
  expect(hostResponse.status).toBe(400);
  const originResponse=await fetch(baseUrl+"/api/dashboard",{headers:{Origin:"https://evil.example",Authorization:"Bearer "+operatorToken}});
  expect(originResponse.status).toBe(403);
 });
});
