export const limits={cpu:1,memory:"1g",pids:64,timeoutMs:120000};
export function resourceMode(){
 const used=Number(process.env.INFERENCE_QUOTA_USED??0), max=Number(process.env.INFERENCE_QUOTA??100000);
 const ratio=max?used/max:1;
 return ratio<.7?"NORMAL":ratio<.9?"ECONOMY":"CRITICAL";
}
