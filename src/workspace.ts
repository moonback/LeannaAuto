import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync=promisify(execFile);
const containerName=(id:string)=>"leanna-"+id.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,40);
export const WORKSPACE_MAX_FILE_BYTES=256*1024;

export class WorkspaceError extends Error {
 constructor(message:string,readonly status=503){super(message);this.name="WorkspaceError";}
}

export function normalizeWorkspacePath(value:string):string {
 if(typeof value!=="string"||value.includes("\0")||value.includes("\\")||value.startsWith("/"))throw new WorkspaceError("Chemin de workspace invalide",400);
 const parts=value.split("/").filter(part=>part!==""&&part!==".");
 if(parts.some(part=>part===".."||part.length>255))throw new WorkspaceError("Chemin de workspace invalide",400);
 const normalized=parts.join("/");
 if(normalized.length>1024)throw new WorkspaceError("Chemin trop long",400);
 return normalized;
}

async function dockerExec(agentId:string,script:string,relativePath:string,maxBuffer=1024*1024):Promise<string>{
 const name=containerName(agentId);
 try{
  const {stdout:status}=await execFileAsync("docker",["inspect","-f","{{.State.Status}}",name],{timeout:5000,maxBuffer:16*1024});
  if(status.trim()!=="running")throw new WorkspaceError("La sandbox de cet agent n'est pas démarrée",409);
 }catch(error){
  if(error instanceof WorkspaceError)throw error;
  const detail=String((error as {stderr?:string;message?:string}).stderr??(error as Error).message??error);
  if(/no such (object|container)/i.test(detail))throw new WorkspaceError("La sandbox de cet agent n'existe pas encore",409);
  throw new WorkspaceError("Docker est indisponible : impossible d'accéder au workspace",503);
 }
 try{
  const {stdout}=await execFileAsync("docker",["exec","--user","1000:1000",name,"sh","-lc",script,"leanna-workspace",relativePath],{timeout:8000,maxBuffer});
  return stdout;
 }catch(error){
  const code=(error as {code?:number|string}).code;
  if(code===40||code==="40")throw new WorkspaceError("Chemin introuvable dans le workspace",404);
  if(code===41||code==="41")throw new WorkspaceError("Cet élément n'est pas un dossier ou un fichier régulier",400);
  if(code===42||code==="42")throw new WorkspaceError("Fichier trop volumineux (limite : 256 Kio)",413);
  const detail=String((error as {stderr?:string;message?:string}).stderr??(error as Error).message??error);
  if(/no such (object|container)|is not running/i.test(detail))throw new WorkspaceError("La sandbox n'est plus disponible",409);
  if(/maxBuffer/i.test(detail))throw new WorkspaceError("Réponse du workspace trop volumineuse",413);
  throw new WorkspaceError("Impossible de lire le workspace dans la sandbox",503);
 }
}

export type WorkspaceEntry={name:string;path:string;type:"directory"|"file"|"symlink"|"other";sizeBytes:number;modifiedAt:string};
const listScript=String.raw`set -eu
input="$1"
[ -n "$input" ] || input=.
target=$(realpath -e -- "$input" 2>/dev/null) || exit 40
case "$target" in /workspace|/workspace/*) ;; *) exit 40 ;; esac
[ -d "$target" ] || exit 41
find "$target" -mindepth 1 -maxdepth 1 ! -name '.leanna-shell.lock' -printf '%f\0%y\0%s\0%T@\0'
`;

export async function listWorkspace(agentId:string,pathValue=""):Promise<{path:string;entries:WorkspaceEntry[]}>{
 const relativePath=normalizeWorkspacePath(pathValue);
 const raw=await dockerExec(agentId,listScript,relativePath);
 const values=raw.split("\0");
 const entries:WorkspaceEntry[]=[];
 for(let i=0;i+3<values.length;i+=4){
  const name=values[i];if(!name)continue;
  const kind=values[i+1],size=Number(values[i+2]),timestamp=Number(values[i+3]);
  const type=kind==="d"?"directory":kind==="f"?"file":kind==="l"?"symlink":"other";
  entries.push({name,path:relativePath?relativePath+"/"+name:name,type,sizeBytes:Number.isFinite(size)?size:0,modifiedAt:Number.isFinite(timestamp)?new Date(timestamp*1000).toISOString():""});
 }
 entries.sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name):a.type==="directory"?-1:b.type==="directory"?1:a.name.localeCompare(b.name));
 return {path:relativePath,entries};
}

const readScript=String.raw`set -eu
target=$(realpath -e -- "$1" 2>/dev/null) || exit 40
case "$target" in /workspace/*) ;; *) exit 40 ;; esac
[ -f "$target" ] || exit 41
size=$(wc -c < "$target")
[ "$size" -le 262144 ] || exit 42
printf '%s\n' "$size"
head -c 262144 -- "$target"
`;

export async function readWorkspaceFile(agentId:string,pathValue:string):Promise<{path:string;sizeBytes:number;content:string;truncated:false}>{
 const relativePath=normalizeWorkspacePath(pathValue);
 if(!relativePath)throw new WorkspaceError("Un fichier doit être sélectionné",400);
 const output=await dockerExec(agentId,readScript,relativePath,WORKSPACE_MAX_FILE_BYTES+4096);
 const separator=output.indexOf("\n");
 if(separator<0)throw new WorkspaceError("Réponse de fichier invalide",502);
 const sizeBytes=Number(output.slice(0,separator).trim());
 return {path:relativePath,sizeBytes,content:output.slice(separator+1),truncated:false};
}
