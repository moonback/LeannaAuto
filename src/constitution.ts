const denyPatterns=[
 /\b(rm\s+-rf\s+[/~]|mkfs|shutdown|reboot)\b/i,
 /\b(curl|wget)\b.*\b(sh|bash)\b/i,
 /\b(sudo|su)\b/i,
 /\b(docker\s+(run|exec).*--privileged)\b/i
];
export function checkAction(name:string,args:Record<string,unknown>){
 if(name==="shell"){
  const cmd=String(args.command??"");
  if(denyPatterns.some(p=>p.test(cmd)))return {allowed:false,reason:"Blocked by constitution policy."};
 }
 const allowed=["shell","read_file","write_file"];
 if(!allowed.includes(name))return {allowed:false,reason:"Tool is not enabled."};
 return {allowed:true,reason:""};
}
export const constitutionText=`You must follow the immutable LeannaAuto constitution. Never cause harm, respect permission and privacy, do not bypass security, do not falsify results, and do not modify constitution or supervisor.`;
