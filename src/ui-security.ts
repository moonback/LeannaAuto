import {randomBytes,scryptSync,timingSafeEqual} from "node:crypto";
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

export function createUiToken():string {
 return randomBytes(32).toString("base64url");
}

export function hashUiToken(token:string):string {
 const salt=randomBytes(16).toString("hex");
 return salt+":"+scryptSync(token,salt,64).toString("hex");
}

export function verifyUiToken(token:string,storedHash:string):boolean {
 const [salt,digest,...extra]=storedHash.split(":");
 if(!salt||!digest||extra.length||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(digest))return false;
 const expected=Buffer.from(digest,"hex"),actual=scryptSync(token,salt,64);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}

export function storedTokenRole(value:string,admin:{token_hash:string;revoked:number}|undefined,operator:{token_hash:string;revoked:number}|undefined,adminEnv:string,operatorEnv:string):UiRole|null {
 if(admin)return admin.revoked===0&&verifyUiToken(value,admin.token_hash)?"admin":null;
 if(operator&&operator.revoked===0&&verifyUiToken(value,operator.token_hash))return "operator";
 if(operator?.revoked===1)return tokenRole(value,adminEnv,"");
 return tokenRole(value,adminEnv,operatorEnv);
}

export function isAllowedUiRequest(role:UiRole,method:string,pathname:string):boolean {
 if(method==="GET"&&(pathname==="/api/security"&&role==="admin"))return true;\n if(method==="GET"&&(pathname==="/api/dashboard"||pathname==="/api/events"||pathname==="/api/resources"||/^\/api\/agents\/[^/]+$/.test(pathname)||/^\/api\/agents\/[^/]+\/workspace(?:\/file)?$/.test(pathname)))return true;
 if(method==="POST"&&(pathname==="/api/tasks"||/^\/api\/agents\/[^/]+\/(?:start|stop)$/.test(pathname)))return true;
 if(role==="admin"&&method==="POST"&&/^\/api\/tasks\/[^/]+\/assign$/.test(pathname))return true;
 if(role==="admin"&&method==="POST"&&( /^\/api\/agents\/[^/]+\/mission\/cancel$/.test(pathname)||/^\/api\/tasks\/[^/]+\/cancel$/.test(pathname)))return true;
 if(role==="admin"&&method==="POST"&&(pathname==="/api/security/tokens"||pathname==="/api/security/settings"||pathname==="/api/agents"||pathname==="/api/emergency-stop"||pathname==="/api/emergency-stop/reset"))return true;
 if(role==="admin"&&method==="PATCH"&&(/^\/api\/agents\/[^/]+$/.test(pathname)||/^\/api\/agents\/[^/]+\/mission$/.test(pathname)||/^\/api\/tasks\/[^/]+$/.test(pathname)))return true;
 if(role==="admin"&&method==="DELETE"&&(/^\/api\/agents\/[^/]+\/mission$/.test(pathname)||/^\/api\/tasks\/[^/]+$/.test(pathname)))return true;
 if(role==="admin"&&method==="DELETE"&&/^\/api\/agents\/[^/]+$/.test(pathname))return true;
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
