import "dotenv/config";
import http from "node:http";
import {randomUUID} from "node:crypto";
import {tokenRole,isAllowedUiRequest,isAllowedUiHost,isAllowedUiOrigin,readJsonBody} from "./ui-security.js";
import {db,log,audit,emergencyStopActive,setEmergencyStop} from "./storage.js";
import {startAgent} from "./agent.js";
import {stopSandbox,deleteSandbox} from "./executor.js";
import {createIdentity,constitutionHash} from "./identity.js";
import {collectSystemMetrics} from "./observability.js";
import {listWorkspace,readWorkspaceFile,WorkspaceError} from "./workspace.js";
import {dashboardHtml as html} from "./ui/template.js";

const port=Number(process.env.UI_PORT??3000);

const adminToken=process.env.LEANNAAUTO_UI_TOKEN??"";
const operatorToken=process.env.LEANNAAUTO_UI_OPERATOR_TOKEN??"";

const server=http.createServer(async(req,res)=>{
 const origin=String(req.headers.origin??"");
 const send=(code:number,obj:any)=>{const headers:Record<string,string>={"Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff","Cache-Control":"no-store","Vary":"Origin"};if(origin&&isAllowedUiOrigin(origin,port))headers["Access-Control-Allow-Origin"]=origin;res.writeHead(code,headers);res.end(JSON.stringify(obj));};
 const host=String(req.headers.host??"");
 if(!isAllowedUiHost(host,port)){res.writeHead(400,{"Content-Type":"text/plain; charset=utf-8","X-Content-Type-Options":"nosniff"});res.end("Invalid host");return;}
 if(origin&&!isAllowedUiOrigin(origin,port)){res.writeHead(403,{"Content-Type":"text/plain; charset=utf-8","X-Content-Type-Options":"nosniff"});res.end("Invalid origin");return;}
 if(req.method==="OPTIONS"){if(origin&&!isAllowedUiOrigin(origin,port)){res.writeHead(403);res.end();return;}const headers:Record<string,string>={"Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS","Vary":"Origin"};if(origin)headers["Access-Control-Allow-Origin"]=origin;res.writeHead(204,headers);res.end();return;}
 if(req.url==="/"||req.url==="/index.html"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Cache-Control":"no-store"});res.end(html);return;}
 let pathname="/";try{pathname=new URL(req.url??"/","http://127.0.0.1").pathname;}catch{return send(400,{error:"URL invalide"});}
 if(!pathname.startsWith("/api/")){res.writeHead(404);res.end("Not found");return;}
 let body:any={};try{if(["POST","PATCH","DELETE"].includes(req.method??"")){const contentType=String(req.headers["content-type"]??"").split(";")[0].trim().toLowerCase();if(contentType!=="application/json")return send(415,{error:"Content-Type application/json requis"});body=await readJsonBody(req,1024*1024);}}catch(e){const message=e instanceof Error?e.message:"";return send(message==="BODY_TOO_LARGE"?413:400,{error:message==="BODY_TOO_LARGE"?"Corps de requête trop volumineux":"JSON invalide"});}
 try{
 if(pathname==="/api/auth"&&req.method==="POST"){const role=tokenRole(String(body.token??""),adminToken,operatorToken);if(!role){audit("auth.failure",null,"Tentative de connexion refusée");return send(401,{error:"Jeton invalide ou jeton UI non configuré"});}audit("auth.success",null,"Connexion "+role+" réussie");return send(200,{ok:true,role});}
 const authHeader=String(req.headers.authorization??"");const suppliedToken=authHeader.startsWith("Bearer ")?authHeader.slice(7):"";const role=tokenRole(suppliedToken,adminToken,operatorToken);if(!role)return send(401,{error:"Authentification requise"});
 if(!isAllowedUiRequest(role,req.method??"GET",pathname))return send(403,{error:"Action non autorisée pour ce rôle"});
 if(pathname==="/api/emergency-stop"&&req.method==="POST"){if(role!=="admin")return send(403,{error:"Action réservée à l’administrateur"});setEmergencyStop(true);const active=db.prepare("SELECT id FROM agents WHERE status='running'").all() as {id:string}[];db.prepare("UPDATE agents SET status='stopped',heartbeat_at=NULL,runtime_owner=NULL WHERE status='running'").run();for(const a of active){try{await stopSandbox(a.id);}catch{}log(a.id,"system","Global emergency stop activated");}audit("system.emergency_stop",null,"Arrêt global demandé par administrateur");return send(200,{ok:true,stopped:active.length});}
 if(pathname==="/api/emergency-stop/reset"&&req.method==="POST"){if(role!=="admin")return send(403,{error:"Action réservée à l’administrateur"});setEmergencyStop(false);audit("system.emergency_reset",null,"Verrouillage global désactivé");return send(200,{ok:true});}

 const missionMatch=pathname.match(/^\/api\/agents\/([^/]+)\/mission$/);
 if(missionMatch&&req.method==="PATCH"){
  const id=decodeURIComponent(missionMatch[1]),goal=String(body.goal??"").trim();
  if(!goal)return send(400,{error:"La mission ne peut pas être vide"});
  if(goal.length>4000)return send(400,{error:"Mission limitée à 4000 caractères"});
  const agent=db.prepare("SELECT id,status FROM agents WHERE id=?").get(id) as {id:string;status:string}|undefined;
  if(!agent)return send(404,{error:"Agent introuvable"});
  if(agent.status==="running")return send(409,{error:"Arrêtez l’agent avant de modifier sa mission"});
  const result=db.prepare("UPDATE agents SET goal=? WHERE id=? AND status<>'running'").run(goal,id);
  if(!result.changes)return send(409,{error:"L’agent est devenu actif ; modification refusée"});
  audit("mission.update",id,"Mission modifiée depuis la console");
  log(id,"system","Agent mission updated");
  return send(200,{ok:true});
 }
 if(missionMatch&&req.method==="DELETE"){
  const id=decodeURIComponent(missionMatch[1]);
  const agent=db.prepare("SELECT id,status,goal FROM agents WHERE id=?").get(id) as {id:string;status:string;goal:string}|undefined;
  if(!agent)return send(404,{error:"Agent introuvable"});
  if(agent.status==="running")return send(409,{error:"Arrêtez l’agent avant de supprimer sa mission"});
  if(!agent.goal)return send(409,{error:"Cet agent n’a pas de mission à supprimer"});
  const result=db.prepare("UPDATE agents SET goal='' WHERE id=? AND status<>'running'").run(id);
  if(!result.changes)return send(409,{error:"L’agent est devenu actif ; suppression refusée"});
  audit("mission.delete",id,"Mission supprimée depuis la console ; agent conservé");
  log(id,"system","Agent mission cleared");
  return send(200,{ok:true});
 }
 const detailMatch=pathname.match(/^\/api\/agents\/([^/]+)$/);if(detailMatch&&req.method==="PATCH"){const id=decodeURIComponent(detailMatch[1]),name=String(body.name??"").trim(),goal=String(body.goal??"").trim();if(!name||!goal)return send(400,{error:"Nom et objectif requis"});if(name.length>80||goal.length>4000)return send(400,{error:"Nom limité à 80 caractères et objectif à 4000 caractères"});const existing=db.prepare("SELECT id,status,goal FROM agents WHERE id=?").get(id) as {id:string;status:string;goal:string}|undefined;if(!existing)return send(404,{error:"Agent introuvable"});if(existing.status==="running"&&goal!==existing.goal)return send(409,{error:"Arrêtez l’agent avant de modifier sa mission"});db.prepare("UPDATE agents SET name=?,goal=? WHERE id=?").run(name,goal,id);audit("agent.update",id,"Nom et mission modifiés depuis la console");log(id,"system","Agent profile updated");return send(200,{ok:true});}if(detailMatch&&req.method==="DELETE"){const id=decodeURIComponent(detailMatch[1]),agent=db.prepare("SELECT id,status FROM agents WHERE id=?").get(id) as {id:string;status:string}|undefined;if(!agent)return send(404,{error:"Agent introuvable"});if(agent.status==="running")return send(409,{error:"Arrêtez l’agent avant de le supprimer"});const children=(db.prepare("SELECT COUNT(*) AS count FROM agents WHERE parent_id=?").get(id) as any).count;if(children>0)return send(409,{error:"Impossible de supprimer un agent qui possède des agents enfants"});const tasks=(db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE agent_id=?").get(id) as any).count;if(tasks>0)return send(409,{error:"Impossible de supprimer un agent qui possède des tâches. Supprimez ou réaffectez ses tâches d’abord."});await deleteSandbox(id);db.prepare("DELETE FROM agents WHERE id=?").run(id);audit("agent.delete",id,"Agent et sandbox supprimés depuis la console");return send(200,{ok:true});}if(detailMatch&&req.method==="GET"){const id=decodeURIComponent(detailMatch[1]);const agent=db.prepare("SELECT * FROM agents WHERE id=?").get(id);if(!agent)return send(404,{error:"Agent introuvable"});const logs=db.prepare("SELECT at,level,message FROM logs WHERE agent_id=? ORDER BY id DESC LIMIT 200").all(id);const tasks=db.prepare("SELECT * FROM tasks WHERE agent_id=? ORDER BY created_at DESC").all(id);return send(200,{agent,logs,tasks});}const wsFile=pathname.match(/^\/api\/agents\/([^/]+)\/workspace\/file$/);if(wsFile&&req.method==="GET"){const id=decodeURIComponent(wsFile[1]);if(!db.prepare("SELECT id FROM agents WHERE id=?").get(id))return send(404,{error:"Agent introuvable"});const params=new URL(req.url??"/","http://127.0.0.1").searchParams;try{return send(200,await readWorkspaceFile(id,params.get("path")??""));}catch(error){if(error instanceof WorkspaceError)return send(error.status,{error:error.message});throw error;}}const ws=pathname.match(/^\/api\/agents\/([^/]+)\/workspace$/);if(ws&&req.method==="GET"){const id=decodeURIComponent(ws[1]);if(!db.prepare("SELECT id FROM agents WHERE id=?").get(id))return send(404,{error:"Agent introuvable"});const params=new URL(req.url??"/","http://127.0.0.1").searchParams;try{return send(200,await listWorkspace(id,params.get("path")??""));}catch(error){if(error instanceof WorkspaceError)return send(error.status,{error:error.message});throw error;}}
 if(pathname==="/api/resources"&&req.method==="GET"){return send(200,await collectSystemMetrics());}
 if(pathname==="/api/events"&&req.method==="GET"){
  const params=new URL(req.url??"/api/events","http://127.0.0.1").searchParams;
  const rawLimit=params.get("limit")??"50",limitValue=Number(rawLimit);
  if(!/^\d+$/.test(rawLimit)||!Number.isSafeInteger(limitValue)||limitValue<1||limitValue>100)return send(400,{error:"Paramètre limit invalide (1-100)"});
  const clauses:string[]=[],values:unknown[]=[];
  const filters:[string,string][]=[["agentId","agent_id"],["taskId","task_id"],["type","type"],["level","level"],["from","at"],["to","at"]];
  for(const [parameter,column] of filters){const value=params.get(parameter);if(value){if(value.length>128)return send(400,{error:"Filtre trop long"});clauses.push(column+(parameter==="from"?">=":parameter==="to"?"<=":"=")+"?");values.push(value);}}
  const before=params.get("before");
  if(before!==null){const cursor=Number(before);if(!/^\d+$/.test(before)||!Number.isSafeInteger(cursor)||cursor<1)return send(400,{error:"Curseur invalide"});clauses.push("id<?");values.push(cursor);}
  const where=clauses.length?" WHERE "+clauses.join(" AND "):"";
  const rows=db.prepare("SELECT id,at,agent_id AS agentId,task_id AS taskId,type,level,source,summary,details_json AS detailsJson,correlation_id AS correlationId FROM events"+where+" ORDER BY id DESC LIMIT ?").all(...values,limitValue) as any[];
  const events=rows.map(row=>({...row,details:JSON.parse(row.detailsJson)}));
  const nextBefore=events.length===limitValue?(events[events.length-1] as {id:number}).id:null;
  return send(200,{events,page:{limit:limitValue,nextBefore}});
 }
 if(pathname==="/api/dashboard"){const agents=db.prepare("SELECT id,name,goal,parent_id,status,created_at,heartbeat_at,restart_count,last_error FROM agents ORDER BY created_at DESC").all() as any[];const tasks=db.prepare("SELECT * FROM tasks ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,created_at DESC LIMIT 200").all();const taskCounts=db.prepare("SELECT status,COUNT(*) AS count FROM tasks GROUP BY status").all() as {status:string;count:number}[];const taskSummary={active:taskCounts.find(x=>x.status==="active")?.count??0,pending:taskCounts.find(x=>x.status==="pending")?.count??0,failed:taskCounts.find(x=>x.status==="failed")?.count??0,completed:taskCounts.find(x=>x.status==="completed")?.count??0,total:taskCounts.reduce((n,x)=>n+x.count,0)};const logs=db.prepare("SELECT agent_id,at,level,message FROM logs ORDER BY id DESC LIMIT 100").all() as any[];const recentEvents=db.prepare("SELECT id,at,agent_id AS agentId,task_id AS taskId,type,level,source,summary,details_json AS detailsJson,correlation_id AS correlationId FROM events ORDER BY id DESC LIMIT 250").all() as any[];const events=recentEvents.map(e=>({...e,details:JSON.parse(e.detailsJson)}));const total=(db.prepare("SELECT COALESCE(SUM(tokens),0) total FROM usage").get() as any).total;const byAgent=db.prepare("SELECT agent_id,SUM(tokens) tokens FROM usage GROUP BY agent_id ORDER BY tokens DESC").all();const quota=Math.max(0,Number(process.env.INFERENCE_QUOTA??100000));const auditRows=db.prepare("SELECT at,action,target,details FROM audit ORDER BY id DESC LIMIT 100").all();return send(200,{agents,tasks,taskCounts:taskSummary,logs,events,audit:auditRows,emergencyStop:emergencyStopActive(),role,usage:{total,quota,remaining:Math.max(0,quota-total),byAgent}});}
 if(pathname==="/api/agents"&&req.method==="POST"){const name=String(body.name||"").trim(),goal=String(body.goal||"").trim();if(!name||!goal)return send(400,{error:"Nom et objectif requis"});const id=name.toLowerCase().replace(/[^a-z0-9-]/g,"-")+"-"+randomUUID().slice(0,8),created=new Date().toISOString(),identity=createIdentity();db.prepare("INSERT INTO agents(id,name,goal,parent_id,status,created_at,identity,constitution_hash,version) VALUES(?,?,?,?,?,?,?,?,?)").run(id,name,goal,null,"stopped",created,identity,constitutionHash(),"0.1.0");log(id,"genesis","Mission: "+goal);audit("agent.create",id,"Agent créé depuis la console");return send(201,{id});}
 const startMatch=pathname.match(/^\/api\/agents\/([^/]+)\/start$/);if(startMatch&&req.method==="POST"){const id=decodeURIComponent(startMatch[1]);if(emergencyStopActive())return send(423,{error:"Arrêt d’urgence actif. Réarmez le système avant de démarrer un agent."});if(!db.prepare("SELECT id FROM agents WHERE id=?").get(id))return send(404,{error:"Agent introuvable"});audit("agent.start",id,"Démarrage demandé depuis la console");try{const runtime=startAgent(id);runtime.catch(e=>{log(id,"ui-error",String(e).slice(0,1000));});return send(202,{ok:true});}catch(e){return send(409,{error:e instanceof Error?e.message:"Démarrage refusé"});}}
 const stopMatch=pathname.match(/^\/api\/agents\/([^/]+)\/stop$/);if(stopMatch&&req.method==="POST"){const id=decodeURIComponent(stopMatch[1]);db.prepare("UPDATE agents SET status='stopped',heartbeat_at=NULL,runtime_owner=NULL WHERE id=?").run(id);await stopSandbox(id);log(id,"system","Stopped via dashboard");audit("agent.stop",id,"Arrêt demandé depuis la console");return send(200,{ok:true});}

 const taskCancelMatch=pathname.match(/^\/api\/tasks\/([^/]+)\/cancel$/);
 if(taskCancelMatch&&req.method==="POST"){
  const id=decodeURIComponent(taskCancelMatch[1]);
  const task=db.prepare("SELECT id,agent_id,status,title FROM tasks WHERE id=?").get(id) as {id:string;agent_id:string;status:string;title:string}|undefined;
  if(!task)return send(404,{error:"Tâche introuvable"});
  if(!["pending","active"].includes(task.status))return send(409,{error:"Seules les tâches en attente ou en cours peuvent être annulées"});
  const now=new Date().toISOString();
  const cancel= db.transaction(()=>{
   const agent=db.prepare("SELECT status FROM agents WHERE id=?").get(task.agent_id) as {status:string}|undefined;
   if(task.status==="active"&&agent?.status==="running")db.prepare("UPDATE agents SET status='stopped',heartbeat_at=NULL,runtime_owner=NULL WHERE id=? AND status='running'").run(task.agent_id);
   const result=db.prepare("UPDATE tasks SET status='cancelled',updated_at=? WHERE id=? AND status IN ('pending','active')").run(now,id);
   return {changed:result.changes,stop:task.status==="active"&&agent?.status==="running"};
  })();
  if(!cancel.changed)return send(409,{error:"La tâche a changé d’état ; annulation refusée"});
  if(cancel.stop)await stopSandbox(task.agent_id);
  audit("task.cancel",id,"Tâche annulée · "+task.title);
  log(task.agent_id,"task","Task cancelled "+id,{taskId:id,eventType:"task.cancel"});
  if(cancel.stop)log(task.agent_id,"system","Agent stopped because its active task was cancelled");
  return send(200,{ok:true,agentStopped:cancel.stop});
 }
 const missionCancelMatch=pathname.match(/^\/api\/agents\/([^/]+)\/mission\/cancel$/);
 if(missionCancelMatch&&req.method==="POST"){
  const id=decodeURIComponent(missionCancelMatch[1]);
  const agent=db.prepare("SELECT id,status,goal FROM agents WHERE id=?").get(id) as {id:string;status:string;goal:string}|undefined;
  if(!agent)return send(404,{error:"Agent introuvable"});
  if(!agent.goal)return send(409,{error:"Cet agent n’a pas de mission à annuler"});
  const now=new Date().toISOString();
  const result=db.transaction(()=>{
   const current=db.prepare("SELECT status FROM agents WHERE id=?").get(id) as {status:string}|undefined;
   if(!current)return {changed:0,stop:false};
   const stop=current.status==="running";
   if(stop)db.prepare("UPDATE agents SET status='stopped',heartbeat_at=NULL,runtime_owner=NULL WHERE id=? AND status='running'").run(id);
   db.prepare("UPDATE tasks SET status='cancelled',updated_at=? WHERE agent_id=? AND status IN ('pending','active')").run(now,id);
   const cleared=db.prepare("UPDATE agents SET goal='' WHERE id=? AND goal<>''").run(id);
   return {changed:cleared.changes,stop};
  })();
  if(!result.changed)return send(409,{error:"La mission a changé d’état ; annulation refusée"});
  if(result.stop)await stopSandbox(id);
  audit("mission.cancel",id,"Mission annulée ; tâches en attente/en cours annulées, agent conservé");
  log(id,"system","Mission cancelled; pending and active tasks cancelled");
  return send(200,{ok:true,agentStopped:result.stop});
 }

 const taskAssignMatch=pathname.match(/^\/api\/tasks\/([^/]+)\/assign$/);
 if(taskAssignMatch&&req.method==="POST"){
  const id=decodeURIComponent(taskAssignMatch[1]),agentId=String(body.agentId||"");
  if(!agentId)return send(400,{error:"Agent requis"});
  const task=db.prepare("SELECT id,agent_id,status,title FROM tasks WHERE id=?").get(id) as {id:string;agent_id:string;status:string;title:string}|undefined;
  if(!task)return send(404,{error:"Tâche introuvable"});
  if(task.status!=="pending")return send(409,{error:"Seules les tâches en attente peuvent être réattribuées"});
  const agent=db.prepare("SELECT id,name,status FROM agents WHERE id=?").get(agentId) as {id:string;name:string;status:string}|undefined;
  if(!agent)return send(404,{error:"Agent introuvable"});
  if(agent.status==="failed")return send(409,{error:"Impossible d’attribuer une tâche à un agent en erreur"});
  const now=new Date().toISOString();
  const result=db.prepare("UPDATE tasks SET agent_id=?,updated_at=? WHERE id=? AND status='pending'").run(agentId,now,id);
  if(!result.changes)return send(409,{error:"La tâche n’est plus en attente ; attribution refusée"});
  audit("task.assign",id,"Tâche attribuée à "+agent.name+" · "+task.title);
  log(agentId,"task","Task assigned "+id+" to "+agent.name,{taskId:id,eventType:"task.assign",previousAgentId:task.agent_id});
  return send(200,{ok:true,agentId});
 }
 const taskMatch=pathname.match(/^\/api\/tasks\/([^/]+)$/);
 if(taskMatch&&req.method==="PATCH"){
  const id=decodeURIComponent(taskMatch[1]),title=String(body.title??"").trim(),description=String(body.description??"");
  if(!title)return send(400,{error:"Le titre de la tâche est requis"});
  if(title.length>200||description.length>4000)return send(400,{error:"Titre limité à 200 caractères et description à 4000 caractères"});
  const task=db.prepare("SELECT id,agent_id,status FROM tasks WHERE id=?").get(id) as {id:string;agent_id:string;status:string}|undefined;
  if(!task)return send(404,{error:"Tâche introuvable"});
  if(task.status==="active")return send(409,{error:"Une tâche active ne peut pas être modifiée"});
  const now=new Date().toISOString();
  const result=db.prepare("UPDATE tasks SET title=?,description=?,updated_at=? WHERE id=? AND status<>'active'").run(title,description,now,id);
  if(!result.changes)return send(409,{error:"La tâche est devenue active ; modification refusée"});
  audit("task.update",id,"Tâche modifiée · "+title);
  log(task.agent_id,"task","Task updated "+id+": "+title,{taskId:id,eventType:"task.update"});
  return send(200,{ok:true});
 }
 if(taskMatch&&req.method==="DELETE"){
  const id=decodeURIComponent(taskMatch[1]);
  const task=db.prepare("SELECT id,agent_id,status,title FROM tasks WHERE id=?").get(id) as {id:string;agent_id:string;status:string;title:string}|undefined;
  if(!task)return send(404,{error:"Tâche introuvable"});
  if(task.status==="active")return send(409,{error:"Une tâche active ne peut pas être supprimée"});
  const result=db.prepare("DELETE FROM tasks WHERE id=? AND status<>'active'").run(id);
  if(!result.changes)return send(409,{error:"La tâche est devenue active ; suppression refusée"});
  audit("task.delete",id,"Tâche supprimée · "+task.title);
  log(task.agent_id,"task","Task deleted "+id+": "+task.title,{taskId:id,eventType:"task.delete"});
  return send(200,{ok:true});
 }
 if(pathname==="/api/tasks"&&req.method==="POST"){const agent=String(body.agent||""),title=String(body.title||"").trim(),desc=String(body.description||"");if(!agent||!title)return send(400,{error:"Agent et titre requis"});if(!db.prepare("SELECT id FROM agents WHERE id=?").get(agent))return send(404,{error:"Agent introuvable"});const id=randomUUID(),now=new Date().toISOString();db.prepare("INSERT INTO tasks(id,agent_id,title,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(id,agent,title,desc,"pending",now,now);log(agent,"task","Added task "+id+": "+title);audit("task.create",id,"Agent "+agent+" · "+title);return send(201,{id});}
 send(404,{error:"Route inconnue"});
 }catch(e){console.error("Dashboard API error:",e);send(500,{error:"Erreur interne du serveur"});}
});
server.requestTimeout=15000;
server.headersTimeout=10000;
server.maxHeadersCount=100;
server.listen(port,"127.0.0.1",()=>console.log("LeannaAuto dashboard: http://127.0.0.1:"+port));
