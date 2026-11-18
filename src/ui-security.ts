import {timingSafeEqual} from "node:crypto";
import type {IncomingMessage} from "node:http";

export type UiRole = "admin" | "operator";

export function tokenRole(value:string,adminToken:string,operatorToken:string):UiRole|null {
 const supplied=Buffer.from(value);
 for(const [role,secret] of [["admin",adminToken],["operator",operatorToken]] as const){
  if(!secret)continue;
  const expected=Buffer.from(secret);
  if(supplied.length===expected.length&&timingSafeEqual(supplied,expected))return role;
 }
 return null;
}

export function isAllowedUiRequest(role:UiRole,method:string,pathname:string):boolean {
 if(method==="GET"&&(pathname==="/api/dashboard"||pathname==="/api/events"||pathname==="/api/resources"||/^\/api\/agents\/[^/]+(?:\/workspace(?:\/file)?)?$/.test(pathname)))return true;
 if(method==="POST"&&(pathname==="/api/tasks"||/^\/api\/agents\/[^/]+\/(?:start|stop)$/.test(pathname)))return true;
 if(role==="admin"&&method==="POST"&&(pathname==="/api/agents"||pathname==="/api/emergency-stop"||pathname==="/api/emergency-stop/reset"))return true;
 return false;
}

export function isAllowedUiHost(host:string,port:number):boolean {
 return host===`127.0.0.1:${port}`||host===`localhost:${port}`;
}

export function isAllowedUiOrigin(origin:string,port:number):boolean {
 return origin===`http://127.0.0.1:${port}`||origin===`http://localhost:${port}`;
}

export async function readJsonBody(req:IncomingMessage,maxBytes:number):Promise<unknown> {
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){
  const data=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
  size+=data.length;
  if(size>maxBytes)throw new Error("BODY_TOO_LARGE");
  chunks.push(data);
 }
 if(size===0)return {};
 const parsed:unknown=JSON.parse(Buffer.concat(chunks).toString("utf8"));
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("JSON_OBJECT_REQUIRED");
 return parsed;
}
