import { generateKeyPairSync,createHash } from "node:crypto";
export function createIdentity(){
 const pair=generateKeyPairSync("ed25519");
 const publicKey=pair.publicKey.export({type:"spki",format:"pem"}).toString();
 // MVP stores only public identity; private key is not persisted or used to sign yet.
 return "ed25519:"+createHash("sha256").update(publicKey).digest("hex");
}
export function constitutionHash(){
 return createHash("sha256").update("LeannaAuto immutable constitution v1").digest("hex");
}
