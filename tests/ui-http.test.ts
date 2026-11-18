import {spawn, type ChildProcess} from "node:child_process";
import Database from "better-sqlite3";
import {request as httpRequest} from "node:http";
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
 it("serves the control room shell with operational sections",async()=>{
  const response=await fetch(baseUrl+"/");
  expect(response.status).toBe(200);
  const html=await response.text();
  expect(html).toContain("Interventions requises");
  expect(html).toContain("function handleControlAlertAction(action,target)");
  expect(html).toContain("data-alert-action");
  expect(html).toContain("Gérer cet agent");
  expect(html).toContain("Examiner les tâches");
  expect(html).toContain("Réarmer le système");
  expect(html).toContain("window.__leannaRole==='admin'");

  expect(html).toContain("Bureau IA");
  expect(html).toContain('id="officeTree"');
  expect(html).toContain("function renderOfficeTree(agents,tasks)");
  expect(html).toContain("office-desk");
  expect(html).toContain("office-task");
  expect(html).toContain("Flux d'activité récent");
  expect(html).toContain("Agents en activité");
  expect(html).toContain("Dernière actualisation");
  expect(html).toContain("Journal d’événements");
  expect(html).toContain("eventTypeFilter");
  expect(html).toContain("Transitions de tâches");
  expect(html).toContain("Décisions des outils");
  expect(html).toContain("Ressources système");
  expect(html).toContain("resourceDocker");
  expect(html).toContain("workspace-layout");
  expect(html).toContain("workspace-breadcrumb");
  expect(html).toContain("previewWorkspaceFile");
  expect(html).toContain("256 Kio");
  expect(html).toContain('autocomplete="username"');
  expect(html).toContain("setInterval(()=>{if(sessionStorage.getItem");
  expect(html).toContain("data:image/svg+xml");
  expect(html).toContain('id="createAgentModal"');
  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-modal="true"');
  expect(html).toContain('id="createAgentOpen"');
  expect(html).toContain('id="agentsRunning"');
  expect(html).toContain('id="agentSearch"');
  expect(html).toContain('id="agentStatusFilter"');
  expect(html).toContain('Dernier heartbeat');
  expect(html).toContain('Dernière erreur');
  expect(html).toContain('function renderAgentDirectory(agents)');
  expect(html).toContain('function openAgentModal()');
  expect(html).toContain('function closeAgentModal()');
  expect(html).toContain("function openEditAgent(id)");
  expect(html).toContain("function deleteAgent(id)");
  expect(html).toContain('id="taskEditModal"');
  expect(html).toContain('id="missionEditModal"');
  expect(html).toContain("function renderTasks(tasks,agents)");
  expect(html).toContain("function openTaskEdit(id)");
  expect(html).toContain("function openTaskAssign(id)");
  expect(html).toContain("data-task-assign");
  expect(html).toContain('id="taskAssignModal"');
  expect(html).toContain("function deleteTask(id)");
  expect(html).toContain("function openMissionEdit(id)");
  expect(html).toContain("function deleteMission(id)");
  expect(html).toContain('data-action="edit"');
  expect(html).toContain('data-action="delete"');
  expect(html).not.toContain("document.getElementById('nTasks')");
  expect(html).not.toContain("document.getElementById('nTokens')");
  expect(html).not.toContain("document.getElementById('recent')");
 });
 it("authenticates an operator and serves the dashboard with exact task counters",async()=>{
  const response=await request("/api/dashboard");
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({role:"operator",taskCounts:{active:0,pending:0,failed:0,completed:0,total:0}});
 });
 it("rejects privileged writes from an operator",async()=>{
  const response=await request("/api/agents",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"blocked",goal:"must be denied"})});
  expect(response.status).toBe(403);
 });
 it("creates an agent and reports exact pending task counts",async()=>{
  const response=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"integration-agent",goal:"HTTP integration test"})});
  expect(response.status).toBe(201);
  const created=await response.json() as {id:string};
  expect(created.id).toBeTruthy();
  const taskResponse=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:created.id,title:"Control room counter test",description:"Verify task aggregation"})});
  expect(taskResponse.status).toBe(201);
  const dashboard=await request("/api/dashboard");
  expect(dashboard.status).toBe(200);
  await expect(dashboard.json()).resolves.toMatchObject({taskCounts:{active:0,pending:1,failed:0,completed:0,total:1}});
 });
 
 it("allows administrators to edit an agent but rejects operator edits",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"editable-agent",goal:"Original mission"})});
  const agent=await created.json() as {id:string};
  const denied=await request("/api/agents/"+encodeURIComponent(agent.id),operatorToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"blocked",goal:"blocked"})});
  expect(denied.status).toBe(403);
  const updated=await request("/api/agents/"+encodeURIComponent(agent.id),adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"renamed-agent",goal:"Updated mission"})});
  expect(updated.status).toBe(200);
  const detail=await request("/api/agents/"+encodeURIComponent(agent.id));
  await expect(detail.json()).resolves.toMatchObject({agent:{name:"renamed-agent",goal:"Updated mission"}});
 });

 it("allows administrators to edit and delete non-active tasks, but rejects operators",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"task-lifecycle-agent",goal:"Task lifecycle test"})});
  expect(created.status).toBe(201);
  const agent=await created.json() as {id:string};
  const made=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:agent.id,title:"Original task",description:"Original description"})});
  expect(made.status).toBe(201);
  const task=await made.json() as {id:string};
  const denied=await request("/api/tasks/"+encodeURIComponent(task.id),operatorToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Blocked",description:"Blocked"})});
  expect(denied.status).toBe(403);
  const updated=await request("/api/tasks/"+encodeURIComponent(task.id),adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Updated task",description:"Updated description"})});
  expect(updated.status).toBe(200);
  const dashboard=await request("/api/dashboard");
  const data=await dashboard.json() as {tasks:Array<{id:string;title:string;description:string}>};
  expect(data.tasks.find(item=>item.id===task.id)).toMatchObject({title:"Updated task",description:"Updated description"});
  const deleted=await request("/api/tasks/"+encodeURIComponent(task.id),adminToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});
  expect(deleted.status).toBe(200);
  const after=await request("/api/dashboard");
  const afterData=await after.json() as {tasks:Array<{id:string}>};
  expect(afterData.tasks.some(item=>item.id===task.id)).toBe(false);
  const missing=await request("/api/tasks/"+encodeURIComponent(task.id),adminToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});
  expect(missing.status).toBe(404);
 });
 it("allows administrators to reassign pending tasks to another agent",async()=>{
  const first=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"assignment-source",goal:"Source"})});
  const source=await first.json() as {id:string};
  const second=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"assignment-target",goal:"Target"})});
  const target=await second.json() as {id:string};
  const made=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:source.id,title:"Task to assign"})});
  const task=await made.json() as {id:string};
  const assignPath="/api/tasks/"+encodeURIComponent(task.id)+"/assign";
  expect((await request(assignPath,operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:target.id})})).status).toBe(403);
  const assigned=await request(assignPath,adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:target.id})});
  expect(assigned.status).toBe(200);
  await expect(assigned.json()).resolves.toMatchObject({ok:true,agentId:target.id});
  const dashboard=await request("/api/dashboard");
  const data=await dashboard.json() as {tasks:Array<{id:string;agent_id:string}>};
  expect(data.tasks.find(item=>item.id===task.id)?.agent_id).toBe(target.id);
  const database=new Database(path.join(directory,"test.db"));
  try{
   database.prepare("UPDATE tasks SET status='active' WHERE id=?").run(task.id);
   expect((await request(assignPath,adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:source.id})})).status).toBe(409);
  }finally{database.close()}
 });
 it("allows administrators to edit and clear missions only while the agent is stopped",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"mission-lifecycle-agent",goal:"Original mission"})});
  expect(created.status).toBe(201);
  const agent=await created.json() as {id:string};
  const denied=await request("/api/agents/"+encodeURIComponent(agent.id)+"/mission",operatorToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal:"Blocked"})});
  expect(denied.status).toBe(403);
  const updated=await request("/api/agents/"+encodeURIComponent(agent.id)+"/mission",adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal:"Updated mission"})});
  expect(updated.status).toBe(200);
  const detail=await request("/api/agents/"+encodeURIComponent(agent.id));
  await expect(detail.json()).resolves.toMatchObject({agent:{goal:"Updated mission"}});
  const deleted=await request("/api/agents/"+encodeURIComponent(agent.id)+"/mission",adminToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});
  expect(deleted.status).toBe(200);
  const cleared=await request("/api/agents/"+encodeURIComponent(agent.id));
  await expect(cleared.json()).resolves.toMatchObject({agent:{goal:""}});
  const repeat=await request("/api/agents/"+encodeURIComponent(agent.id)+"/mission",adminToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});
  expect(repeat.status).toBe(409);
 });
 it("validates task and mission edit payloads",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"validation-agent",goal:"Mission"})});
  const agent=await created.json() as {id:string};
  const taskResponse=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:agent.id,title:"Validation task"})});
  const task=await taskResponse.json() as {id:string};
  expect((await request("/api/tasks/"+task.id,adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"",description:"x"})})).status).toBe(400);
  expect((await request("/api/agents/"+agent.id+"/mission",adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal:" "})})).status).toBe(400);
 });

 it("refuses task and mission changes while their runtime is active",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"active-guard-agent",goal:"Active guard mission"})});
  const agent=await created.json() as {id:string};
  const made=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:agent.id,title:"Active task",description:"Must be immutable while running"})});
  const task=await made.json() as {id:string};
  const database=new Database(path.join(directory,"test.db"));
  try{
   database.prepare("UPDATE tasks SET status='active' WHERE id=?").run(task.id);
   database.prepare("UPDATE agents SET status='running' WHERE id=?").run(agent.id);
   expect((await request("/api/tasks/"+task.id,adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Changed",description:"Changed"})})).status).toBe(409);
   expect((await request("/api/tasks/"+task.id,adminToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"})).status).toBe(409);
   expect((await request("/api/agents/"+agent.id+"/mission",adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal:"Changed"})})).status).toBe(409);
   expect((await request("/api/agents/"+agent.id,adminToken,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"active-guard-agent",goal:"Bypass attempt"})})).status).toBe(409);
   expect((await request("/api/agents/"+agent.id+"/mission",adminToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"})).status).toBe(409);
  }finally{database.close()}
 });
 it("restricts agent deletion to stopped leaf agents without tasks",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"deletable-agent",goal:"Deletion guard test"})});
  const agent=await created.json() as {id:string};
  const operatorDelete=await request("/api/agents/"+encodeURIComponent(agent.id),operatorToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});
  expect(operatorDelete.status).toBe(403);
  const task=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:agent.id,title:"Keep agent"})});
  expect(task.status).toBe(201);
  const blocked=await request("/api/agents/"+encodeURIComponent(agent.id),adminToken,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});
  expect(blocked.status).toBe(409);
  const stillThere=await request("/api/agents/"+encodeURIComponent(agent.id));
  expect(stillThere.status).toBe(200);
 });

 it("rejects workspace path traversal before attempting Docker access",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"workspace-path-check",goal:"Verify workspace path guard"})});
  expect(created.status).toBe(201);
  const agent=await created.json() as {id:string};
  const listing=await request("/api/agents/"+encodeURIComponent(agent.id)+"/workspace?path="+encodeURIComponent("../outside"));
  expect(listing.status).toBe(400);
  await expect(listing.json()).resolves.toMatchObject({error:"Chemin de workspace invalide"});
  const preview=await request("/api/agents/"+encodeURIComponent(agent.id)+"/workspace/file?path="+encodeURIComponent("../../etc/passwd"));
  expect(preview.status).toBe(400);
 });
 it("exposes host, runtime, disk and Docker resource snapshots",async()=>{
  const response=await request("/api/resources");
  expect(response.status).toBe(200);
  const data=await response.json() as any;
  expect(data.host.memory.totalBytes).toBeGreaterThan(0);
  expect(data.host.memory.freeBytes).toBeGreaterThan(0);
  expect(data.host.cpuCores).toBeGreaterThan(0);
  expect(data.host.uptimeSeconds).toBeGreaterThan(0);
  expect(data.host.disk).toHaveProperty("available");
  expect(data.runtime.pid).toBeGreaterThan(0);
  expect(data.runtime.memory.rssBytes).toBeGreaterThan(0);
  expect(data.configuredLimits).toMatchObject({cpuCores:1,memory:"1g",pids:64});
  expect(data.docker).toHaveProperty("available");
  expect(Array.isArray(data.docker.containers)).toBe(true);
 });
 it("exposes filtered, cursor-paginated structured events to operators",async()=>{
  const first=await request("/api/events?limit=2");
  expect(first.status).toBe(200);
  const page=await first.json() as {events:Array<{id:number;type:string;summary:string}>;page:{nextBefore:number|null}};
  expect(page.events.length).toBe(2);
  expect(page.events.some(event=>event.type==="audit"||event.type==="log")).toBe(true);
  expect(page.page.nextBefore).toBeTypeOf("number");
  const next=await request("/api/events?limit=2&before="+page.page.nextBefore);
  expect(next.status).toBe(200);
  const nextPage=await next.json() as {events:Array<{id:number}>};
  expect(nextPage.events.every(event=>event.id<page.page.nextBefore!)).toBe(true);
  const filtered=await request("/api/events?type=audit&limit=20");
  const filteredPage=await filtered.json() as {events:Array<{type:string}>};
  expect(filteredPage.events.length).toBeGreaterThan(0);
  expect(filteredPage.events.every(event=>event.type==="audit")).toBe(true);
 });
 it("redacts common secret patterns from persisted event summaries",async()=>{
  const created=await request("/api/agents",adminToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"redaction-check",goal:"token=integration-secret-value"})});
  expect(created.status).toBe(201);
  const agent=await created.json() as {id:string};
  const response=await request("/api/events?agentId="+encodeURIComponent(agent.id)+"&type=log&limit=10");
  expect(response.status).toBe(200);
  const page=await response.json() as {events:Array<{summary:string}>};
  expect(page.events.some(event=>event.summary.includes("[REDACTED]"))).toBe(true);
  expect(JSON.stringify(page.events)).not.toContain("integration-secret-value");
 });
 it("rejects invalid event pagination parameters",async()=>{
  expect((await request("/api/events?limit=0")).status).toBe(400);
  expect((await request("/api/events?before=invalid")).status).toBe(400);
 });
 it("rejects non-JSON write requests",async()=>{
  const response=await request("/api/tasks",operatorToken,{method:"POST",headers:{"Content-Type":"text/plain"},body:"not-json"});
  expect(response.status).toBe(415);
 });
 it("rejects untrusted Host and Origin headers",async()=>{
  const address=new URL(baseUrl);
  const hostStatus=await new Promise<number>((resolve,reject)=>{
   const req=httpRequest({hostname:address.hostname,port:Number(address.port),path:"/api/dashboard",method:"GET",headers:{Host:"evil.example:3000",Authorization:"Bearer "+operatorToken}},res=>{
    res.resume();
    res.on("end",()=>resolve(res.statusCode??0));
   });
   req.on("error",reject);
   req.end();
  });
  expect(hostStatus).toBe(400);
  const originResponse=await fetch(baseUrl+"/api/dashboard",{headers:{Origin:"https://evil.example",Authorization:"Bearer "+operatorToken}});
  expect(originResponse.status).toBe(403);
 });
});
