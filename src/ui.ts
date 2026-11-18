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

const port=Number(process.env.UI_PORT??3000);
const html=String.raw`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LeannaAuto</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23101a2b'/%3E%3Cpath d='M32 9 53 32 32 55 11 32Z' fill='none' stroke='%237894ff' stroke-width='6'/%3E%3C/svg%3E"><style>
*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#e8edf8;font-family:Inter,Segoe UI,Arial,sans-serif}aside{position:fixed;inset:0 auto 0 0;width:230px;background:#11182a;border-right:1px solid #26334b;padding:24px 16px}h1{font-size:22px;margin:0 0 26px}nav button{display:block;width:100%;text-align:left;padding:12px;margin:4px 0;background:transparent;border:0;color:#b8c4dc;border-radius:9px;cursor:pointer}nav button:hover,nav button.active{background:#23314a;color:white}main{margin-left:230px;padding:28px;max-width:1400px}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.muted{color:#91a1bc}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}.card{background:#141d30;border:1px solid #26334b;border-radius:14px;padding:18px;margin-bottom:16px}.metric{font-size:28px;font-weight:700;margin-top:8px}.section{display:none}.section.show{display:block}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:12px;border-bottom:1px solid #27344b;font-size:14px}button.action{background:#526de5;color:white;border:0;border-radius:8px;padding:9px 12px;cursor:pointer}button.danger{background:#a63b51}input,textarea,select{width:100%;background:#0c1425;color:#fff;border:1px solid #34445f;border-radius:8px;padding:10px;margin:6px 0 12px}pre{white-space:pre-wrap;word-break:break-word;color:#c8d5ed;max-height:60vh;overflow:auto}.badge{border-radius:20px;padding:4px 9px;background:#26344a;font-size:12px}.row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1}.mobile{display:none}@media(max-width:760px){aside{position:relative;width:auto;inset:auto;padding:12px}nav{display:flex;overflow:auto}nav button{white-space:nowrap;width:auto}main{margin:0;padding:16px}h1{margin-bottom:8px}.mobile{display:block}}

:root{color-scheme:dark;--bg:#080d18;--panel:#101a2b;--line:#263750;--text:#edf3ff;--muted:#91a2bd;--blue:#6d8cff;--green:#35c995;--red:#ef6478}
*{box-sizing:border-box}body{background:radial-gradient(ellipse at 75% -20%,#1a2c4c 0,transparent 42%),var(--bg);font:14px/1.55 Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif}
aside{width:254px;background:rgba(11,19,33,.97);padding:25px 17px;display:flex;flex-direction:column;backdrop-filter:blur(16px)}
aside h1{font-size:17px;letter-spacing:.2px;padding:0 10px 23px;border-bottom:1px solid var(--line)}
nav button{display:flex;align-items:center;gap:10px;padding:11px 13px;border:1px solid transparent;color:#a9b8d0;font-size:13px;font-weight:650;transition:.18s}
nav button:hover{background:#17263d;color:#fff}nav button.active{background:linear-gradient(90deg,#253b61,#1b2c47);border-color:#314c75;color:#fff;box-shadow:inset 3px 0 #7894ff}
main{margin-left:254px;padding:30px 36px 48px;max-width:1680px}.top{padding-bottom:20px;border-bottom:1px solid var(--line);gap:18px}.top h2{font-size:23px;letter-spacing:-.5px}
.card{background:linear-gradient(145deg,rgba(20,32,52,.97),rgba(14,24,40,.97));border:1px solid var(--line);border-radius:15px;padding:19px;box-shadow:0 10px 30px #00000012}
.cards{gap:15px}.metric{font-size:30px;letter-spacing:-1px;font-variant-numeric:tabular-nums}.metric-card{position:relative;overflow:hidden;min-height:124px}.metric-label{font-size:12px;color:var(--muted);font-weight:650}.metric-foot{font-size:11px;color:#7f91ad;margin-top:7px}.metric-icon{position:absolute;right:17px;top:17px;width:34px;height:34px;border:1px solid #344a6a;border-radius:10px;display:grid;place-items:center;color:#a8bbff;background:#1b2c48}
.section.show{animation:fadein .2s ease}@keyframes fadein{from{opacity:.5;transform:translateY(3px)}to{opacity:1;transform:none}}
button.action{border-radius:9px;padding:9px 14px;font-weight:650;transition:.15s}button.action:hover{filter:brightness(1.12);transform:translateY(-1px)}
input,textarea,select{background:#0b1423;border:1px solid #30425e;border-radius:9px;padding:11px 12px;font-size:13px}input:focus,textarea:focus,select:focus{border-color:#7894ff;box-shadow:0 0 0 3px #7894ff20}
pre{background:#0a1321;border:1px solid #22334d;border-radius:10px;padding:15px;font:12px/1.65 ui-monospace,Consolas,monospace}
table{border-collapse:collapse}td,th{padding:12px 13px;border-bottom:1px solid #24344b;font-size:12px}th{color:#8ea2c1;font-size:10px;text-transform:uppercase;letter-spacing:.8px;background:#111d30}
.badge{font-size:10px;font-weight:750}.status-strip{display:flex;align-items:center;gap:10px;padding:12px 15px;border:1px solid #285c50;background:#102a29;border-radius:11px;margin-bottom:17px;color:#a6e5d1;font-size:12px}.status-strip.warning{border-color:#79533a;background:#302318;color:#f2c98b}.status-strip.danger{border-color:#75404b;background:#321c27;color:#ff9aaa}.status-strip.unknown{border-color:#3c4a60;background:#1b2638;color:#b8c7dd}
.control-metrics{grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:16px}.control-columns{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:15px}.control-card-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}.control-card-head h3{margin:0}.control-card-head p{margin:4px 0 0;font-size:12px}.health-pill{font-size:11px;font-weight:750;border-radius:20px;padding:5px 10px;background:#173b32;color:#83e2bf}.health-pill.warning{background:#46351e;color:#f2c98b}.health-pill.danger{background:#482632;color:#ff9aaa}.health-pill.unknown{background:#25334a;color:#aebbd0}.control-health-row{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid #24344b}.control-health-row:last-child{border-bottom:0}.control-health-row span:last-child{color:#dce6f7;text-align:right}.control-alerts{display:grid;gap:9px}.control-alert{border:1px solid #62414a;background:#2b1b26;border-radius:10px;padding:10px 12px}.control-alert.warning{border-color:#665233;background:#2b251a}.control-alert strong{display:block;font-size:12px}.control-alert p{margin:4px 0 0;color:#b9c6da;font-size:12px;overflow-wrap:anywhere}.control-empty{padding:17px 10px;color:#91a2bd;text-align:center;font-size:12px}.control-activity{display:grid}.activity-row{display:grid;grid-template-columns:145px minmax(0,1fr);gap:12px;padding:10px 0;border-bottom:1px solid #24344b}.activity-row:last-child{border-bottom:0}.activity-time{font-size:11px;color:#8194b2}.activity-message{font-size:12px;overflow-wrap:anywhere}.activity-message b{color:#dce6f7}.agent-link{background:transparent;border:0;color:#a9bdff;padding:0;text-align:left;cursor:pointer;font:inherit}.agent-link:hover{text-decoration:underline}.control-footer{display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:0 4px 12px}@media(max-width:1050px){.control-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.control-columns{grid-template-columns:1fr}}@media(max-width:560px){.control-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.activity-row{grid-template-columns:1fr;gap:2px}.control-card-head{align-items:flex-start;flex-direction:column}.control-footer{flex-direction:column}}.mission-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:16px}.mission-card{background:#0c1627;border:1px solid #2a3c57;border-radius:12px;padding:16px;min-width:0}.mission-card h4{margin:0;font-size:15px}.mission-card p{margin:8px 0;color:#aab9d0}.mission-card .mission-goal{color:#dce6f7}.mission-card .mission-meta{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.mission-card .mission-meta span{font-size:11px;padding:4px 8px;border-radius:20px;background:#1b2a41;color:#b9c9e2}.mission-card .mission-task{border-left:2px solid #6d8cff;padding:7px 0 7px 11px;margin:12px 0}.mission-card .mission-actions{display:flex;gap:8px;margin-top:12px}.mission-empty{padding:28px;text-align:center;color:var(--muted)}
.workspace-toolbar{align-items:end;margin:12px 0}.workspace-toolbar>div{min-width:220px}
.workspace-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:10px 12px;margin:12px 0;background:#0b1423;border:1px solid #263750;border-radius:10px;font-size:12px}
.workspace-breadcrumb button{background:transparent;border:0;color:#a9bdff;cursor:pointer;padding:3px 5px}.workspace-breadcrumb button:hover{text-decoration:underline}.workspace-breadcrumb span{color:#7185a4}
.workspace-layout{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(0,1.15fr);gap:14px;min-height:380px}
.workspace-files,.workspace-preview{min-width:0;border:1px solid #263750;border-radius:11px;background:#0b1423;overflow:hidden}
.workspace-list-head{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #263750;font-size:12px}
.workspace-entries{max-height:540px;overflow:auto}.workspace-entry{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 12px;border-bottom:1px solid #1e2d43;font-size:12px}.workspace-entry:last-child{border-bottom:0}
.workspace-entry button{border:0;background:transparent;color:#cbd8ed;text-align:left;cursor:pointer;min-width:0;overflow-wrap:anywhere;font:inherit}.workspace-entry button:hover{color:#9eb3ff}.workspace-entry .entry-meta{font-size:10px;color:#7f91ad;white-space:nowrap}
.workspace-entry .entry-icon{color:#91a9d9;text-align:center}.workspace-preview pre{margin:0;border:0;border-radius:0;max-height:540px;min-height:320px;overflow:auto;white-space:pre;word-break:normal}
.workspace-note{font-size:11px;margin:14px 2px 0}
@media(max-width:900px){.workspace-layout{grid-template-columns:1fr}.workspace-entries{max-height:300px}.workspace-preview pre{min-height:220px;max-height:420px}}

.agents-page-head{align-items:center;margin:4px 0 16px}.agents-page-head h3,.agents-directory h3{margin:0;font-size:17px}.agents-page-head p,.agents-directory .control-card-head p{margin:4px 0 0}.agents-metrics{grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:15px}.agents-directory{padding:20px}.agents-filters{align-items:end;margin:12px 0 16px}.agents-filters>div{min-width:220px}.agents-filters label,.agent-create-form label{display:block;font-size:12px;font-weight:700;color:#c6d3e8}.agents-filters input,.agents-filters select{margin-bottom:0}.agents-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px}.agent-card{background:linear-gradient(145deg,#101d31,#0c1627);border:1px solid #2a3d59;border-radius:13px;padding:16px;min-width:0}.agent-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.agent-card-title{display:flex;gap:10px;align-items:center;min-width:0}.agent-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:11px;display:grid;place-items:center;background:#1c3150;border:1px solid #35517a;color:#b9caff;font-weight:800;font-size:15px}.agent-card h4{margin:0;font-size:14px;overflow-wrap:anywhere}.agent-card-id{font:10px ui-monospace,Consolas,monospace;color:#8295b2;overflow-wrap:anywhere;margin-top:3px}.agent-state{white-space:nowrap;border-radius:20px;padding:4px 9px;font-size:10px;font-weight:800;background:#26344a;color:#c0cde0}.agent-state.running{background:#153b33;color:#85e2bf}.agent-state.failed{background:#482632;color:#ff9aaa}.agent-state.stopped{background:#29364a;color:#b7c6dc}.agent-goal{color:#c5d2e7;font-size:12px;line-height:1.55;margin:14px 0;min-height:38px;overflow-wrap:anywhere}.agent-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.agent-info{background:#0a1423;border:1px solid #20324c;border-radius:9px;padding:9px;min-width:0}.agent-info span{display:block;color:#8295b2;font-size:10px}.agent-info strong{display:block;color:#dce6f7;font-size:11px;margin-top:3px;overflow-wrap:anywhere}.agent-error{border-left:2px solid #ef6478;background:#2a1b27;color:#ffb0bb;padding:8px 10px;border-radius:0 7px 7px 0;font-size:11px;overflow-wrap:anywhere;margin:10px 0}.agent-card-actions{display:flex;flex-wrap:wrap;gap:7px;border-top:1px solid #243750;padding-top:12px;margin-top:12px}.agent-card-actions .action{font-size:11px;padding:7px 10px}.agent-empty{grid-column:1/-1;padding:34px 15px;text-align:center;color:var(--muted);border:1px dashed #30425e;border-radius:11px}.agent-modal[hidden]{display:none!important}.agent-modal{position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:20px}.agent-modal-backdrop{position:absolute;inset:0;background:#020711d9;backdrop-filter:blur(7px)}.agent-modal-panel{position:relative;width:min(560px,100%);max-height:min(90vh,760px);overflow:auto;background:linear-gradient(150deg,#17263d,#0d1728 70%);border:1px solid #3a5275;border-radius:17px;padding:24px;box-shadow:0 28px 90px #0009;animation:agentModalIn .18s ease}@keyframes agentModalIn{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}.agent-modal-head{display:flex;justify-content:space-between;gap:18px;padding-bottom:17px;border-bottom:1px solid #2a3d59;margin-bottom:18px}.agent-modal-head h3{font-size:21px;margin:4px 0}.agent-modal-head p{font-size:12px;margin:4px 0}.agent-modal-kicker{font-size:9px;font-weight:800;letter-spacing:1.5px;color:#8fa9ff}.agent-modal-close{width:34px;height:34px;border-radius:9px;border:1px solid #344967;background:#14233a;color:#c8d5e9;font-size:22px;cursor:pointer}.agent-create-form input,.agent-create-form textarea{margin:7px 0 0}.agent-create-form textarea{resize:vertical;min-height:120px}.field-hint{font-size:10px;color:#8194b2;margin:5px 0 16px}.agent-modal-actions{display:flex;justify-content:flex-end;gap:9px;padding-top:16px;border-top:1px solid #2a3d59;margin-top:18px}.agent-modal-actions .secondary{background:#26364e}.agent-form-error{background:#3a202b;border:1px solid #784252;color:#ffb1bd;border-radius:9px;padding:9px 11px;font-size:12px;margin-top:12px}
@media(max-width:1050px){.agents-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.agents-page-head{align-items:flex-start;flex-direction:column}.agents-filters{display:block}.agents-filters>div{margin-bottom:10px}.agents-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.agent-modal{padding:10px}.agent-modal-panel{padding:18px}.agent-info-grid{grid-template-columns:1fr 1fr}}
.task-table{display:grid;gap:9px}.task-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px;border:1px solid #293d59;border-radius:11px;background:#0c1728}.task-row h4{margin:0;font-size:13px;overflow-wrap:anywhere}.task-row p{margin:4px 0;color:#9aacc6;font-size:11px;overflow-wrap:anywhere}.task-row-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.task-row-meta span{font-size:10px;color:#9aacc6;background:#1b2a41;border-radius:20px;padding:3px 7px}.task-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.task-actions .action{font-size:10px;padding:7px 9px}.task-actions .action:disabled{opacity:.35;cursor:not-allowed;transform:none}.mission-actions{flex-wrap:wrap}.mission-actions .action{font-size:10px;padding:7px 9px}.mission-actions .action:disabled{opacity:.4}@media(max-width:650px){.task-row{grid-template-columns:1fr}.task-actions{justify-content:flex-start}}@media(max-width:760px){aside{width:auto;padding:12px 14px}main{margin:0;padding:19px 14px 35px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.card{padding:15px}}

:root{--surface:#111d30;--stroke:#2a3d59;--ink:#edf3ff;--subtle:#91a2bd}
body{background:radial-gradient(ellipse at 78% -18%,#263e67 0,transparent 38%),linear-gradient(145deg,#080e1a,#0a1220 58%,#0b1424);letter-spacing:.005em}
aside{border-right:1px solid #263b59;box-shadow:14px 0 44px #00000018}aside h1{font-size:18px;letter-spacing:-.35px}
nav{display:grid;gap:3px}nav button{min-height:42px;border-radius:11px;padding:10px 12px}
main{width:calc(100% - 254px);max-width:none;padding:30px clamp(20px,3vw,52px) 60px}
.top{position:sticky;top:0;z-index:5;background:#0a1220e8;backdrop-filter:blur(18px);margin:-30px -10px 25px;padding:22px 10px 18px}
.top h2{font-size:25px;font-weight:750}.card{border-color:#293d5b;background:linear-gradient(150deg,#17263cdd,#101b2ddd);box-shadow:0 14px 42px #00000020}
.metric-card{border-radius:17px;min-height:132px}.metric{font-size:34px}
button,input,textarea,select{font:inherit}button.action{min-height:38px;border:1px solid #6c85ed;background:linear-gradient(135deg,#617bea,#4965ca);box-shadow:0 5px 16px #344eaa30}
button.action.secondary{background:#1c2c45;border:1px solid #354c6e;box-shadow:none}button.action.danger{background:linear-gradient(135deg,#b94c65,#8e344c);border-color:#b85c70}
button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #9bb0ff;outline-offset:3px}
.office-page-head{display:flex;justify-content:space-between;align-items:end;gap:18px;margin:4px 0 18px}.office-page-head h3{font-size:24px;letter-spacing:-.6px;margin:5px 0}.office-page-head p{margin:4px 0}.office-kicker{font-size:10px;font-weight:800;letter-spacing:1.8px;color:#93aaff}
.office-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.office-summary>div{padding:14px 16px;border:1px solid #293d59;border-radius:14px;background:linear-gradient(145deg,#17263c,#101a2b)}.office-summary span{display:block;color:#8fa2c0;font-size:11px}.office-summary strong{display:block;font-size:26px;letter-spacing:-.8px;margin-top:3px;font-variant-numeric:tabular-nums}
.office-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 2px 15px}.office-legend{display:flex;flex-wrap:wrap;gap:16px}.office-legend span{font-size:11px;color:#aab9d0;display:flex;align-items:center;gap:7px}.legend-dot,.office-live i{width:8px;height:8px;border-radius:50%;display:inline-block;background:#8293ad}.legend-dot.running{background:#50d5a6;box-shadow:0 0 10px #50d5a677}.legend-dot.failed{background:#f0788b}
.office-scene{position:relative;overflow:hidden;border:1px solid #304766;border-radius:20px;background:radial-gradient(ellipse at 50% 0%,#29456c 0,transparent 55%),linear-gradient(155deg,#14253c,#0b1728 72%);box-shadow:inset 0 1px #ffffff0b,0 22px 65px #00000030;min-height:480px}
.office-scene:before{content:"";position:absolute;inset:80px 0 0;opacity:.22;background-image:linear-gradient(#5b79a1 1px,transparent 1px),linear-gradient(90deg,#5b79a1 1px,transparent 1px);background-size:42px 42px;transform:perspective(650px) rotateX(58deg) scale(1.55);transform-origin:center top;pointer-events:none}
.office-scene-top{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:17px 20px;border-bottom:1px solid #ffffff12;background:#0a1525a8}.office-scene-top b{font-size:13px}.office-scene-top span{font-size:11px;color:#91a4c1}.office-live{display:flex;align-items:center;gap:7px;color:#8be0c1!important;font-size:9px!important;font-weight:800;letter-spacing:1px}.office-live i{background:#50d5a6;box-shadow:0 0 12px #50d5a6}
.office-tree{position:relative;z-index:1;padding:35px 20px 55px;min-height:390px;perspective:1100px;overflow:auto}.office-forest{display:flex;justify-content:center;align-items:flex-start;gap:30px;min-width:max-content;margin:0 auto;padding:0;list-style:none}.office-branch{position:relative;display:flex;flex-direction:column;align-items:center;padding:0 10px;list-style:none}.office-children{display:flex;justify-content:center;align-items:flex-start;gap:18px;position:relative;margin:23px 0 0;padding:23px 0 0;list-style:none}.office-children:before{content:"";position:absolute;top:0;left:50%;height:23px;border-left:1px solid #6683b5}.office-children:after{content:"";position:absolute;top:0;left:calc(10px + 1%);right:calc(10px + 1%);border-top:1px solid #6683b5}.office-children>.office-branch:before{content:"";position:absolute;top:0;left:50%;height:23px;border-left:1px solid #6683b5}
.office-desk{position:relative;display:flex;flex-direction:column;align-items:center;width:210px;min-height:205px;padding:15px 13px 13px;border:1px solid #456184;border-radius:15px;background:linear-gradient(145deg,#203754,#14243a 72%);color:#edf3ff;cursor:pointer;text-align:center;box-shadow:0 15px 0 #091322,0 19px 30px #0006;transform:rotateX(5deg) translateZ(12px);transform-style:preserve-3d;transition:transform .2s,border-color .2s,box-shadow .2s}
.office-desk:hover{transform:translateY(-7px) rotateX(0) translateZ(22px);border-color:#9bb0ff;box-shadow:0 18px 0 #091322,0 26px 42px #0008}.office-desk:focus-visible{outline:2px solid #a7b8ff;outline-offset:4px}
.office-person{position:relative;width:62px;height:68px;margin:0 auto 7px;filter:drop-shadow(0 8px 6px #0007);transform:translateZ(16px)}.office-head{position:absolute;top:0;left:19px;width:26px;height:27px;border-radius:45% 45% 42% 42%;background:linear-gradient(145deg,#f3c9a5,#c88c70);border:2px solid #f7d8b5}.office-hair{position:absolute;top:-3px;left:17px;width:30px;height:15px;border-radius:15px 15px 7px 7px;background:#28344b;z-index:2}.office-eye{position:absolute;top:13px;left:26px;width:3px;height:3px;border-radius:50%;background:#263044;z-index:3;box-shadow:10px 0 #263044}.office-body{position:absolute;top:29px;left:12px;width:39px;height:29px;border-radius:12px 12px 8px 8px;background:linear-gradient(145deg,var(--agent-tone),#243c63);border:1px solid #ffffff30}.office-arm{position:absolute;top:34px;left:5px;width:11px;height:25px;border-radius:8px;background:var(--agent-tone);transform:rotate(18deg)}.office-arm.right{left:47px;transform:rotate(-18deg)}.office-legs{position:absolute;top:54px;left:19px;width:10px;height:14px;border-radius:5px;background:#25364e;box-shadow:14px 0 #25364e}
.office-agent-name{font-size:13px;font-weight:800;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.office-agent-role{font-size:10px;color:#9fb1cc;margin:3px 0 8px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.office-agent-state{font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:4px 8px;border-radius:20px;background:#26364c;color:#b8c6d9}.office-desk.running .office-agent-state{background:#174437;color:#8be0c1}.office-desk.failed .office-agent-state{background:#482633;color:#ff9aaa}
.office-task{width:100%;margin-top:10px;padding:8px 9px;border-radius:9px;background:#0b1727;border:1px solid #304664;text-align:left}.office-task small{display:block;color:#8499b8;font-size:9px;text-transform:uppercase;letter-spacing:.7px}.office-task strong{display:block;color:#dce7f8;font-size:10px;line-height:1.4;margin-top:3px;overflow-wrap:anywhere}.office-task em{display:block;color:#8ca1bf;font-size:9px;font-style:normal;margin-top:3px}
.office-tone-0{--agent-tone:#7997f4}.office-tone-1{--agent-tone:#57c8ad}.office-tone-2{--agent-tone:#d39a67}.office-tone-3{--agent-tone:#b18ce8}.office-tone-4{--agent-tone:#e17d9d}.office-tone-5{--agent-tone:#7eb8df}
.office-empty{padding:65px 20px;text-align:center;color:#a6b7d0}.office-empty strong{display:block;color:#e5edfa;font-size:17px;margin-bottom:7px}.office-empty p{font-size:12px;max-width:440px;margin:0 auto 16px}
@media(max-width:900px){.office-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.office-page-head{align-items:flex-start;flex-direction:column}.office-tree{padding:25px 12px 40px}}
@media(max-width:560px){.office-summary>div{padding:11px}.office-summary strong{font-size:22px}.office-toolbar{align-items:flex-start;flex-direction:column}.office-scene-top{align-items:flex-start;flex-direction:column}.office-desk{width:180px}.office-children{gap:8px}.office-forest{gap:10px}}
@media(max-width:760px){main{width:100%;padding:18px 14px 38px}.top{position:relative;margin:-18px -4px 20px;padding:14px 4px}.top h2{font-size:21px}aside{box-shadow:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}

/* LeannaAuto · Premium Operations UI refresh */
:root{
 --bg:#080d18;--panel:#111d30;--panel-raised:#17263d;--stroke:#2b405f;
 --text:#f1f5ff;--muted:#91a2bd;--accent:#8da4ff;--accent-strong:#647ff0;
 --success:#54d6a8;--warning:#f0bd73;--danger:#f17e91;
}
html{scroll-behavior:smooth}
body{min-height:100vh;color:var(--text);background:
 radial-gradient(ellipse at 80% -12%,rgba(73,108,177,.2),transparent 38%),
 radial-gradient(ellipse at 0% 100%,rgba(38,65,112,.13),transparent 42%),var(--bg)}
aside{
 width:272px;padding:26px 18px 18px;background:rgba(9,16,29,.94);
 border-right:1px solid rgba(125,151,195,.17);box-shadow:18px 0 55px #00000020;
}
aside h1{font-size:19px;padding:0 11px 22px;margin-bottom:18px;border-bottom:1px solid rgba(125,151,195,.16)}
aside h1:before{content:"";display:inline-block;width:9px;height:9px;margin-right:9px;border-radius:3px;background:var(--accent);box-shadow:0 0 18px #829bff99;transform:rotate(45deg)}
nav{gap:5px}
nav button{
 min-height:43px;padding:10px 13px;border-radius:10px;color:#aab9d0;
 font-size:12px;font-weight:650;letter-spacing:.01em;
}
nav button:hover{background:#192942;color:#f4f7ff}
nav button.active{
 color:#f7f9ff;background:linear-gradient(100deg,rgba(90,119,211,.25),rgba(39,60,96,.52));
 border-color:rgba(126,153,255,.24);box-shadow:inset 3px 0 var(--accent),0 6px 18px #00000016;
}
aside>p{line-height:1.8!important;color:#8295b2!important}
main{width:calc(100% - 272px);margin-left:272px;padding:30px clamp(22px,3.2vw,58px) 64px}
.top{
 margin:-30px -12px 28px;padding:22px 12px 19px;
 border-bottom:1px solid rgba(125,151,195,.16);
 background:rgba(8,14,25,.86);backdrop-filter:blur(20px);
}
.top h2{font-size:26px;letter-spacing:-.8px;font-weight:760}
.top>div{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.card{
 background:linear-gradient(145deg,rgba(22,36,58,.96),rgba(14,24,40,.98));
 border:1px solid rgba(112,139,184,.23);border-radius:16px;
 box-shadow:0 14px 38px #00000020, inset 0 1px #ffffff08;
 transition:border-color .18s,transform .18s,box-shadow .18s;
}
.metric-card{min-height:138px;padding:20px}
.metric{font-size:35px;letter-spacing:-1.2px;font-weight:760}
.metric-label{font-size:11px;letter-spacing:.035em;text-transform:uppercase;color:#9aacc7}
.metric-foot{font-size:11px;color:#8093b1}
.control-columns{gap:16px}
.control-card-head h3,.card>h3{font-size:15px;letter-spacing:-.2px}
.status-strip{border-radius:12px;padding:13px 16px}
.health-pill,.badge{letter-spacing:.02em}
button.action{min-height:39px;border-radius:10px;padding:9px 15px;font-size:12px;font-weight:700}
button.action:hover{box-shadow:0 8px 22px #3e5ab744;filter:brightness(1.08);transform:translateY(-1px)}
button.action.secondary{background:#1b2b43;border-color:#3a5275;color:#d6e0f1}
button.action.danger{background:linear-gradient(135deg,#b94d65,#87344c);border-color:#b85c70}
input,textarea,select{border-radius:10px;background:#0a1424;border-color:#344967;color:#edf3ff}
input::placeholder,textarea::placeholder{color:#687d9d}
table{border-spacing:0}
td,th{padding:13px 15px}
th{background:#142238;color:#9aacc8}
tr:hover td{background:#ffffff04}
pre{border-color:#2a3e5c;background:#091321;border-radius:12px}
.agent-card,.mission-card,.task-row{border-color:#304663;box-shadow:0 8px 22px #00000018}
.agent-card:hover,.mission-card:hover{border-color:#526d9a;transform:translateY(-2px);box-shadow:0 15px 32px #0000002a}
.agent-info,.workspace-files,.workspace-preview{border-color:#2b405f}
.agent-modal-panel{border-color:#49658d;box-shadow:0 30px 100px #000b}
.office-scene{border-color:#3a557a}
.control-footer{padding-top:6px}
button:disabled{cursor:not-allowed}
@media(max-width:900px){
 aside{width:230px}main{width:calc(100% - 230px);margin-left:230px}
}
@media(max-width:760px){
 aside{position:sticky;top:0;z-index:8;width:100%;padding:10px 12px;background:rgba(8,14,25,.97);border-right:0;border-bottom:1px solid #2a3d59}
 aside h1{padding:0 8px 10px;margin:0 0 8px;font-size:16px;border:0}
 nav{display:flex;gap:5px;overflow-x:auto;padding:2px 0 5px;scrollbar-width:thin}
 nav button{flex:0 0 auto;min-height:36px;width:auto;padding:8px 11px;white-space:nowrap}
 aside>p{display:none}
 main{width:100%;margin:0;padding:18px 14px 38px}
 .top{position:relative;top:auto;margin:-18px -4px 20px;padding:14px 4px}
 .top h2{font-size:21px}
}
@media(max-width:560px){
 .cards,.control-metrics,.agents-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
 .metric-card{min-height:116px;padding:14px}
 .metric{font-size:28px}
 .card{padding:15px}
 .top>div{gap:6px}
 .top .action{padding:7px 9px;font-size:10px}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}


/* Page-specific refinement · second pass */
.section.show{min-width:0}
.section>.card:first-child,.section>.control-card-head:first-child{margin-top:2px}
.section h3{letter-spacing:-.25px}
.section .muted{line-height:1.55}
.office-page-head{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:23px 25px;margin:0 0 16px;border:1px solid #2b4162;border-radius:17px;background:radial-gradient(ellipse at 88% 0%,#314c7933,transparent 45%),linear-gradient(120deg,#152641,#101b2e)}
.office-kicker{font-size:10px;font-weight:800;letter-spacing:1.5px;color:#9fb2ff}
.office-page-head h3{font-size:22px;letter-spacing:-.7px;margin:6px 0}
.office-page-head p{font-size:12px;margin:0;max-width:620px}
.office-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 16px}
.office-summary>div{padding:17px 18px;border-radius:13px;border:1px solid #2a3e5d;background:linear-gradient(145deg,#172943,#101b2d);min-width:0}
.office-summary span{display:block;font-size:11px;color:#95a9c7}
.office-summary strong{display:block;margin-top:5px;font-size:29px;line-height:1.2;letter-spacing:-1px;font-variant-numeric:tabular-nums}
.office-toolbar{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:14px 2px}
.office-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#a9bad3}
.office-legend span{display:flex;align-items:center;gap:6px}
.legend-dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:#71839e}
.legend-dot.running{background:#54d6a8;box-shadow:0 0 10px #54d6a866}
.legend-dot.failed{background:#f17e91}.legend-dot.stopped{background:#71839e}
.office-scene{border:1px solid #304765;border-radius:16px;overflow:hidden;background:radial-gradient(ellipse at 50% 0%,#20385a 0,transparent 62%),#0b1627}
.office-scene-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 18px;border-bottom:1px solid #2a3f5c;background:#111f33}
.office-scene-top b{font-size:12px}.office-scene-top span{font-size:11px;color:#91a5c3}
.office-live{font-size:9px!important;letter-spacing:1px;font-weight:800;color:#6fe0b5!important}
.office-live i{display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:#54d6a8;box-shadow:0 0 9px #54d6a8}
.office-tree{min-height:280px;padding:34px 20px 45px}
.office-desk{border:1px solid #385477!important;background:linear-gradient(145deg,#213b5c,#12233b)!important;box-shadow:0 14px 28px #0004,inset 0 1px #ffffff13!important}
.office-task{transition:border-color .16s,transform .16s;background:#0d1b2e}
.office-task:hover{border-color:#6e8bca;transform:translateY(-2px)}
.mission-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:13px}
.mission-card{position:relative;overflow:hidden;padding:18px;background:linear-gradient(145deg,#14243a,#0d192b);box-shadow:0 10px 25px #0002}
.mission-card:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:#607de0;opacity:.8}
.mission-card h4{font-size:14px;letter-spacing:-.2px}
.mission-card .mission-goal{font-size:12px;line-height:1.65;color:#d4def0}
.mission-card .mission-meta span{border:1px solid #2b4263;background:#172943}
.mission-card .mission-task{background:#101f34;border-left-color:#8da4ff;border-radius:0 8px 8px 0;padding:10px 12px}
.mission-card .mission-actions{flex-wrap:wrap}
.task-table{overflow-x:auto;border:1px solid #2b405f;border-radius:12px;background:#0d192a}
.task-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:15px 17px;border:0;border-bottom:1px solid #263a55;border-radius:0;background:transparent}
.task-row:last-child{border-bottom:0}
.task-row:hover{background:#ffffff05}
.task-row h4{font-size:13px;margin:0 0 4px;color:#edf3ff}
.task-row p{font-size:11px;color:#9aacc6;margin:0;overflow-wrap:anywhere}
.task-row-meta{display:flex;flex-wrap:wrap;gap:7px 14px;margin-top:9px;color:#8196b5;font-size:10px}
.task-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
.task-actions .action{font-size:10px;padding:7px 10px}
#logOutput,#auditOutput,#lineageTree{max-height:65vh;min-height:220px;padding:18px;line-height:1.75;background:linear-gradient(145deg,#091422,#0c192b);border:1px solid #2b405f;color:#c6d5ec;font-size:11px;tab-size:2}
#logOutput,#auditOutput{white-space:pre-wrap;overflow-wrap:anywhere}
#settingsTable,#usageTable,#supervisorTable,#resourceRuntime,#resourceLimits,#resourceDocker{overflow-x:auto;border:1px solid #2b405f;border-radius:12px;background:#0d192a}
#settingsTable table,#usageTable table,#supervisorTable table,#resourceRuntime table,#resourceLimits table,#resourceDocker table{width:100%;min-width:460px}
#settingsTable tr:last-child td,#usageTable tr:last-child td{border-bottom:0}
#settingsTable td:first-child,#usageTable td:first-child{color:#cbd8eb;font-weight:650}
#resourceStatus{margin:12px 0 16px}
#resourceSampledAt{font-size:11px;color:#8195b3}
#resourceRuntime,#resourceLimits,#resourceDocker{padding:4px}
#resourceRuntime td,#resourceLimits td,#resourceDocker td{font-size:11px}
#usageTable td,#supervisorTable td{font-variant-numeric:tabular-nums}
#taskEditModal .agent-modal-panel,#missionEditModal .agent-modal-panel{width:min(620px,100%)}
.section form:not(.agent-create-form):not(#loginForm){max-width:100%}
.section>.card form label{display:block;color:#bdcbe0;font-size:11px;font-weight:700;margin-top:8px}
.section>.card form button.action{margin-top:5px}
.section input[type=search]{margin-bottom:0}
.mission-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.mission-filters input{flex:1;min-width:220px}.mission-filters select{min-width:150px}#missionVisibleCount{display:block;font-size:11px;margin:4px 0 10px}
.task-filterbar{align-items:center;gap:9px;margin:14px 0}.task-filterbar input{flex:1;min-width:220px}.task-filterbar select{min-width:170px}#taskVisibleCount,#logVisibleCount{font-size:11px;margin:7px 0;color:var(--muted)}#logs input[type=search]{margin:8px 0 2px}@media(max-width:560px){.task-filterbar{align-items:stretch;flex-direction:column}.task-filterbar input,.task-filterbar select{width:100%;min-width:0}}
@media(max-width:900px){.office-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.office-page-head{align-items:flex-start;flex-direction:column}.task-row{grid-template-columns:minmax(0,1fr)}.task-actions{justify-content:flex-start}}
@media(max-width:560px){.office-page-head{padding:18px}.office-page-head h3{font-size:19px}.office-summary>div{padding:13px}.office-summary strong{font-size:24px}.office-toolbar{align-items:flex-start;flex-direction:column}.office-scene-top{align-items:flex-start;flex-direction:column}.task-row{padding:13px}.mission-grid{grid-template-columns:minmax(0,1fr)}#logOutput,#auditOutput,#lineageTree{font-size:10px;padding:12px}}

</style></head><body><div id="authGate" style="position:fixed;inset:0;background:#080d19ee;z-index:10;display:flex;align-items:center;justify-content:center;padding:20px"><form id="loginForm" class="card" style="width:min(420px,100%)"><h2>Authentification</h2><p class="muted">Saisissez votre jeton administrateur ou opérateur.</p><input type="text" name="username" autocomplete="username" aria-hidden="true" tabindex="-1" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"><input id="authToken" name="password" type="password" autocomplete="current-password" required placeholder="Jeton administrateur"><button class="action" style="width:100%">Se connecter</button><p id="authError" class="muted"></p></form></div><aside><h1>◈ LeannaAuto <small style="display:block;color:#91a2bd;font-size:10px;letter-spacing:1.4px;margin-top:5px">AGENT OPERATIONS</small></h1><nav><button class="active" onclick="page('overview',this)">◫ &nbsp;Vue d'ensemble</button><button onclick="page('office',this)">▧ &nbsp;Bureau IA</button><button onclick="page('agents',this)">◉ &nbsp;Agents</button><button onclick="page('missions',this)">▣ &nbsp;Missions</button><button onclick="page('tasks',this)">☷ &nbsp;Tâches</button><button onclick="page('supervisor',this)">⌁ &nbsp;Supervision</button><button onclick="page('lineage',this)">⌘ &nbsp;Filiation</button><button onclick="page('logs',this)">≋ &nbsp;Logs système</button><button onclick="page('audit',this)">▤ &nbsp;Audit</button><button onclick="page('usage',this)">◌ &nbsp;Quota IA</button><button onclick="page('resources',this)">▥ &nbsp;Ressources</button><button onclick="page('workspace',this)">▣ &nbsp;Workspace</button><button onclick="page('settings',this)">⚙ &nbsp;Sécurité & paramètres</button></nav><p class="muted" style="margin-top:auto;padding:15px 10px;border-top:1px solid #263750;font-size:11px">● Console locale sécurisée<br>Accès par jeton · localhost</p></aside><main><div class="top"><h2 id="heading">Vue d'ensemble</h2><div><span id="roleLabel" class="muted"></span> <button class="action danger" id="emergencyButton" onclick="toggleEmergency()">Arrêt d’urgence</button> <span class="muted" id="refresh">Live · 5s</span></div></div>
<section id="office" class="section"><div class="office-page-head"><div><span class="office-kicker">LEANNAAUTO · ESPACE DE TRAVAIL</span><h3>Le bureau des intelligences</h3><p class="muted">Chaque agent occupe son poste. Les liens représentent sa filiation et les cartes affichent ses tâches.</p></div><button class="action" onclick="page('agents',document.querySelector('nav button[onclick*=agents]'))">Gérer les agents</button></div><div class="office-summary"><div><span>Agents présents</span><strong id="officeAgentCount">0</strong></div><div><span>Au travail</span><strong id="officeRunningCount">0</strong></div><div><span>Tâches actives</span><strong id="officeActiveTasks">0</strong></div><div><span>En attente</span><strong id="officePendingTasks">0</strong></div></div><div class="office-toolbar"><div class="office-legend"><span><i class="legend-dot running"></i>En mission</span><span><i class="legend-dot stopped"></i>À l’arrêt</span><span><i class="legend-dot failed"></i>En erreur</span></div><span class="muted" id="officeUpdated">Synchronisation toutes les 5 secondes</span></div><div class="office-scene"><div class="office-scene-top"><div><b>Vue hiérarchique 3D</b><span> Sélectionnez un personnage pour ouvrir sa fiche.</span></div><span class="office-live"><i></i> EN DIRECT</span></div><div id="officeTree" class="office-tree" role="tree" aria-label="Arbre des agents"><div class="office-empty">Chargement du bureau…</div></div></div></section>
<section id="overview" class="section show">
<div id="systemBanner" class="status-strip"><span>Initialisation du centre de contrôle…</span></div>
<div class="cards control-metrics">
<div class="card metric-card"><div class="metric-label">Agents enregistrés</div><div class="metric" id="nAgents">—</div><div class="metric-foot">Tous les agents connus</div></div>
<div class="card metric-card"><div class="metric-label">En mission</div><div class="metric" id="nRunning">—</div><div class="metric-foot">Agents avec runtime actif</div></div>
<div class="card metric-card"><div class="metric-label">Tâches actives</div><div class="metric" id="nTasksActive">—</div><div class="metric-foot">Travail en cours</div></div>
<div class="card metric-card"><div class="metric-label">À traiter</div><div class="metric" id="nAttention">—</div><div class="metric-foot">Alertes opérationnelles détectées</div></div>
</div>
<div class="control-columns">
<div class="card"><div class="control-card-head"><div><h3>État opérationnel</h3><p class="muted">Synthèse basée sur les statuts et heartbeats enregistrés.</p></div><span id="systemHealth" class="health-pill">—</span></div><div id="controlHealth"></div></div>
<div class="card"><div class="control-card-head"><div><h3>Interventions requises</h3><p class="muted">Anomalies nécessitant une vérification.</p></div><span class="badge" id="alertCount">0</span></div><div id="controlAlerts" class="control-alerts"></div></div>
</div>
<div class="card"><div class="control-card-head"><div><h3>Agents en activité</h3><p class="muted">Leur mission, leur tâche et la fraîcheur du heartbeat.</p></div><button class="action" onclick="page('missions',document.querySelector('nav button[onclick*=missions]'))">Voir les missions</button></div><div id="overviewAgents"></div></div>
<div class="card"><div class="control-card-head"><div><h3>Flux d'activité récent</h3><p class="muted">Derniers événements persistés par les agents.</p></div><button class="action" onclick="page('logs',document.querySelector('nav button[onclick*=logs]'))">Journal complet</button></div><div id="controlActivity" class="control-activity"></div></div>
<div class="control-footer muted"><span id="controlUpdated">Dernière actualisation : —</span><span>Actualisation automatique · 5 secondes</span></div>
</section>
<section id="missions" class="section"><div id="missionEditModal" class="agent-modal" hidden><div class="agent-modal-backdrop" data-close-mission-modal></div><div class="agent-modal-panel" role="dialog" aria-modal="true" aria-labelledby="missionEditTitle"><div class="agent-modal-head"><div><span class="agent-modal-kicker">GESTION DES MISSIONS</span><h3 id="missionEditTitle">Modifier la mission</h3><p class="muted" id="missionEditAgent"></p></div><button type="button" class="agent-modal-close" data-close-mission-modal aria-label="Fermer">×</button></div><form id="missionEditForm" class="agent-create-form"><label for="missionEditGoal">Objectif de l’agent</label><textarea id="missionEditGoal" maxlength="4000" rows="7" required></textarea><p class="field-hint">Une mission ne peut être modifiée que lorsque l’agent est arrêté.</p><div id="missionEditError" class="agent-form-error" role="alert" hidden></div><div class="agent-modal-actions"><button type="button" class="action secondary" data-close-mission-modal>Annuler</button><button class="action" type="submit">Enregistrer la mission</button></div></form></div></div><div class="status-strip"><span>Suivi des missions en direct · actualisation toutes les 5 secondes</span></div><div class="cards"><div class="card metric-card"><div class="metric-label">Missions en cours</div><div class="metric" id="missionRunning">—</div><div class="metric-foot">Agents actuellement actifs</div></div><div class="card metric-card"><div class="metric-label">Tâches actives</div><div class="metric" id="missionTasksActive">—</div><div class="metric-foot">Tâches prises en charge</div></div><div class="card metric-card"><div class="metric-label">En attente</div><div class="metric" id="missionTasksPending">—</div><div class="metric-foot">Tâches à démarrer</div></div><div class="card metric-card"><div class="metric-label">Agents en erreur</div><div class="metric" id="missionFailed">—</div><div class="metric-foot">Agents à examiner</div></div></div><div class="card"><div class="row" style="align-items:center"><div><h3>Agents en mission</h3><p class="muted">Mission, tâche actuelle et dernière activité connue.</p></div><div class="mission-filters"><input id="missionSearch" type="search" placeholder="Rechercher un agent, une mission ou une tâche…" aria-label="Rechercher dans les missions"><select id="missionFilter" style="max-width:190px"><option value="all">Tous les états</option><option value="running">En mission</option><option value="stopped">À l’arrêt</option><option value="failed">En erreur</option></select></div><span id="missionVisibleCount" class="muted" aria-live="polite"></span></div><div id="missionBoard" class="mission-grid"></div></div></section><section id="agents" class="section">
<div class="control-card-head agents-page-head"><div><h3>Gestion des agents</h3><p class="muted">Créez, surveillez et pilotez les agents enregistrés dans cette instance.</p></div><button id="createAgentOpen" class="action" type="button">＋ Créer un agent</button></div>
<div class="cards agents-metrics">
 <div class="card metric-card"><div class="metric-label">Total des agents</div><div class="metric" id="agentsCount">—</div><div class="metric-foot">Agents enregistrés</div></div>
 <div class="card metric-card"><div class="metric-label">En mission</div><div class="metric" id="agentsRunning">—</div><div class="metric-foot">Runtime actif</div></div>
 <div class="card metric-card"><div class="metric-label">À l’arrêt</div><div class="metric" id="agentsStopped">—</div><div class="metric-foot">En attente de démarrage</div></div>
 <div class="card metric-card"><div class="metric-label">En erreur</div><div class="metric" id="agentsFailed">—</div><div class="metric-foot">À examiner</div></div>
</div>
<div class="card agents-directory">
 <div class="control-card-head"><div><h3>Agents existants</h3><p class="muted">État, mission, activité récente et actions disponibles.</p></div><span class="badge" id="agentsVisibleCount">0 agent</span></div>
 <div class="row agents-filters"><div><label for="agentSearch">Rechercher</label><input id="agentSearch" type="search" placeholder="Nom, identifiant ou objectif…"></div><div><label for="agentStatusFilter">Statut</label><select id="agentStatusFilter"><option value="all">Tous les statuts</option><option value="running">En mission</option><option value="stopped">À l’arrêt</option><option value="failed">En erreur</option></select></div></div>
 <div id="agentTable" class="agents-grid"><div class="control-empty">Chargement des agents…</div></div>
</div>
<div id="createAgentModal" class="agent-modal" hidden>
 <div class="agent-modal-backdrop" data-close-agent-modal></div>
 <div class="agent-modal-panel" role="dialog" aria-modal="true" aria-labelledby="createAgentTitle" aria-describedby="createAgentDescription">
  <div class="agent-modal-head"><div><span class="agent-modal-kicker">NOUVELLE IDENTITÉ</span><h3 id="createAgentTitle">Créer un agent</h3><p id="createAgentDescription" class="muted">Définissez son identité et la mission qu’il devra poursuivre.</p></div><button type="button" class="agent-modal-close" aria-label="Fermer" data-close-agent-modal>×</button></div>
  <form id="createAgent" class="agent-create-form">
   <label for="agentName">Nom de l’agent</label><input id="agentName" name="name" required maxlength="80" placeholder="Ex. Analyste système">
   <p class="field-hint">Un nom court et identifiable dans le centre de contrôle.</p>
   <label for="agentGoal">Objectif et mission</label><textarea id="agentGoal" name="goal" required maxlength="4000" rows="5" placeholder="Décrivez précisément ce que cet agent doit accomplir…"></textarea>
   <p class="field-hint">Précisez le résultat attendu et le périmètre de sa mission.</p>
   <div id="createAgentError" class="agent-form-error" role="alert" hidden></div>
   <div class="agent-modal-actions"><button type="button" class="action secondary" data-close-agent-modal>Annuler</button><button class="action" type="submit">Créer l’agent</button></div>
  </form>
 </div>
</div>
</section>
<section id="tasks" class="section"><div class="card"><h3>Créer une tâche</h3><form id="createTask"><label>Agent</label><select id="taskAgent"></select><label>Titre</label><input id="taskTitle" required maxlength="200"><label>Description</label><textarea id="taskDesc" maxlength="4000"></textarea><button class="action">Ajouter</button></form></div><div class="card"><div class="row task-filterbar"><input id="taskSearch" type="search" placeholder="Rechercher une tâche ou un agent…" aria-label="Rechercher une tâche ou un agent"><select id="taskStatusFilter" aria-label="Filtrer les tâches par statut"><option value="all">Tous les statuts</option><option value="pending">En attente</option><option value="active">En cours</option><option value="completed">Terminées</option><option value="failed">En erreur</option></select><span id="taskVisibleCount" class="muted" aria-live="polite"></span></div><div id="taskTable"></div></div><div id="taskEditModal" class="agent-modal" hidden><div class="agent-modal-backdrop" data-close-task-modal></div><div class="agent-modal-panel" role="dialog" aria-modal="true" aria-labelledby="taskEditTitle"><div class="agent-modal-head"><div><span class="agent-modal-kicker">GESTION DES TÂCHES</span><h3 id="taskEditTitle">Modifier la tâche</h3><p class="muted">L’agent assigné et le statut ne sont pas modifiables ici.</p></div><button type="button" class="agent-modal-close" data-close-task-modal aria-label="Fermer">×</button></div><form id="taskEditForm" class="agent-create-form"><label for="taskEditTitleInput">Titre</label><input id="taskEditTitleInput" maxlength="200" required><label for="taskEditDescription">Description</label><textarea id="taskEditDescription" maxlength="4000" rows="6"></textarea><div id="taskEditError" class="agent-form-error" role="alert" hidden></div><div class="agent-modal-actions"><button type="button" class="action secondary" data-close-task-modal>Annuler</button><button class="action" type="submit">Enregistrer</button></div></form></div></div></section>
<section id="logs" class="section"><div class="card"><h3>Journal d’événements</h3><label>Filtrer par agent</label><select id="logFilter" onchange="refresh()"><option value="">Tous</option></select><label>Type d’événement</label><select id="eventTypeFilter" onchange="refresh()"><option value="">Tous</option><option value="log">Logs runtime</option><option value="audit">Audit opérateur</option><option value="task_transition">Transitions de tâches</option><option value="llm_call">Appels LLM</option><option value="llm_usage">Usage LLM</option><option value="tool_decision">Décisions des outils</option><option value="tool_execution">Exécution des outils</option></select><label for="logSearch">Recherche dans les événements chargés</label><input id="logSearch" type="search" placeholder="Rechercher un message, un type ou un agent…"><p id="logVisibleCount" class="muted" aria-live="polite"></p><pre id="logOutput"></pre><p class="muted">Événements persistés · 100 plus récents · pagination API disponible.</p></div></section>
<section id="supervisor" class="section"><div class="cards"><div class="card">Agents actifs<div class="metric" id="supTotal">—</div></div><div class="card">Redémarrages<div class="metric" id="supRestarts">—</div></div><div class="card">Erreurs<div class="metric" id="supErrors">—</div></div></div><div class="card"><h3>État du watchdog</h3><div id="supervisorTable"></div><p class="muted">Watchdog actuel : surveillance de boucle, sans récupération de processus indépendante.</p></div></section><section id="lineage" class="section"><div class="card"><h3>Filiation</h3><pre id="lineageTree"></pre></div></section><section id="settings" class="section"><div class="card"><h3>Paramètres et sécurité</h3><div id="settingsTable"></div><p>Interface locale · Docker socket sensible · constitution heuristique.</p></div></section><section id="detail" class="section"><div class="card"><h3>Fiche agent</h3><div id="agentDetail"></div></div></section><section id="workspace" class="section">
<div class="card">
 <div class="control-card-head"><div><h3>Workspace sécurisé · lecture seule</h3><p class="muted">Explorez les fichiers persistants de la sandbox sans ouvrir de terminal ni autoriser d’écriture.</p></div><button class="action" onclick="loadWorkspace()">Actualiser</button></div>
 <div class="row workspace-toolbar"><div><label for="wsAgent">Agent</label><select id="wsAgent" onchange="loadWorkspace('')"></select></div><div><label for="wsSearch">Rechercher dans ce dossier</label><input id="wsSearch" type="search" placeholder="Nom de fichier ou dossier…" oninput="renderWorkspaceEntries()"></div></div>
 <div id="wsStatus" class="status-strip unknown">Sélectionnez un agent pour explorer son workspace.</div>
 <div id="wsBreadcrumb" class="workspace-breadcrumb"></div>
 <div class="workspace-layout">
  <div class="workspace-files"><div class="workspace-list-head"><b>Fichiers et dossiers</b><span id="wsCount" class="muted"></span></div><div id="wsEntries" class="workspace-entries"><div class="control-empty">Aucun contenu chargé.</div></div></div>
  <div class="workspace-preview"><div class="workspace-list-head"><b id="wsPreviewTitle">Aperçu du fichier</b><span id="wsPreviewMeta" class="muted">—</span></div><pre id="wsOutput">Sélectionnez un fichier pour afficher son contenu.</pre></div>
 </div>
 <p class="muted workspace-note">Accès strictement en lecture seule · aperçu limité à 256 Kio · les liens symboliques ne sont pas ouverts · aucun terminal ni téléchargement n'est exposé.</p>
</div></section><section id="audit" class="section"><div class="card"><h3>Journal d’audit</h3><pre id="auditOutput"></pre></div></section><section id="usage" class="section"><div class="cards"><div class="card">Tokens utilisés<div class="metric" id="usageTotal">—</div></div><div class="card">Quota<div class="metric" id="usageQuota">—</div></div><div class="card">Restant<div class="metric" id="usageRemaining">—</div></div></div><div class="card"><h3>Par agent</h3><div id="usageTable"></div></div></section>
<section id="resources" class="section">
 <div class="control-card-head"><div><h3>Ressources système</h3><p class="muted">Mesures instantanées de l’hôte, du processus UI et des conteneurs LeannaAuto.</p></div><button class="action" onclick="loadResources()">Actualiser</button></div>
 <div id="resourceStatus" class="status-strip unknown">Chargement des mesures…</div>
 <div class="cards control-metrics">
  <div class="card metric-card"><div class="metric-label">CPU hôte</div><div class="metric" id="resourceCpu">—</div><div class="metric-foot" id="resourceCpuMeta">Échantillon en attente</div></div>
  <div class="card metric-card"><div class="metric-label">RAM hôte</div><div class="metric" id="resourceMemory">—</div><div class="metric-foot" id="resourceMemoryMeta">—</div></div>
  <div class="card metric-card"><div class="metric-label">Disque du workspace</div><div class="metric" id="resourceDisk">—</div><div class="metric-foot" id="resourceDiskMeta">—</div></div>
  <div class="card metric-card"><div class="metric-label">Uptime hôte</div><div class="metric" id="resourceUptime">—</div><div class="metric-foot" id="resourcePlatform">—</div></div>
 </div>
 <div class="control-columns">
  <div class="card"><h3>Processus LeannaAuto UI</h3><div id="resourceRuntime"></div></div>
  <div class="card"><h3>Limites configurées par sandbox</h3><div id="resourceLimits"></div></div>
 </div>
 <div class="card"><h3>Conteneurs Docker LeannaAuto</h3><div id="resourceDocker"></div><p class="muted">Les statistiques Docker sont une mesure ponctuelle. L’absence de données n’est pas interprétée comme une consommation nulle.</p></div>
 <p class="muted" id="resourceSampledAt"></p>
</section>
</main><script>
const fmt=n=>Number(n||0).toLocaleString('fr-FR');async function toggleEmergency(){const active=document.getElementById('emergencyButton').dataset.active==='1';if(!confirm(active?'Désactiver le verrouillage global ? Les agents ne redémarreront pas automatiquement.':'Arrêter tous les agents immédiatement ?'))return;try{await api(active?'/emergency-stop/reset':'/emergency-stop',{method:'POST'});refresh()}catch(e){alert(e.message)}}async function api(url,opts={}){const token=sessionStorage.getItem('leanna_ui_token');const headers={'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(opts.headers||{})};const r=await fetch('/api'+url,{...opts,headers});const j=await r.json();if(r.status===401){sessionStorage.removeItem('leanna_ui_token');document.getElementById('authGate').style.display='flex';throw Error(j.error||'Authentification requise')}if(!r.ok)throw Error(j.error||'Erreur');return j}
function page(id,b){document.querySelectorAll('.section').forEach(x=>x.classList.remove('show'));document.getElementById(id).classList.add('show');document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b?.classList.add('active');document.getElementById('heading').textContent=b?.textContent||id;if(id==='resources')loadResources();if(id==='workspace')loadWorkspace()}
function formatBytes(value){if(value===null||value===undefined||!Number.isFinite(Number(value)))return 'Indisponible';const units=['B','KiB','MiB','GiB','TiB'];let n=Number(value),i=0;while(n>=1024&&i<units.length-1){n/=1024;i++}return n.toFixed(i===0?0:1)+' '+units[i]}
function formatDuration(seconds){if(!Number.isFinite(Number(seconds)))return 'Indisponible';const s=Math.max(0,Math.floor(Number(seconds))),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return (d?d+' j ':'')+(h+' h '+m+' min')}
async function loadResources(){const status=document.getElementById('resourceStatus');status.textContent='Collecte des mesures…';try{const d=await api('/resources'),h=d.host,r=d.runtime,mem=h.memory,disk=h.disk;document.getElementById('resourceCpu').textContent=h.cpuPercent===null?'—':h.cpuPercent.toFixed(1)+' %';document.getElementById('resourceCpuMeta').textContent=h.cpuPercent===null?'Mesure disponible au prochain échantillon':h.cpuCores+' cœurs logiques';document.getElementById('resourceMemory').textContent=mem.usedPercent===null?'—':mem.usedPercent.toFixed(1)+' %';document.getElementById('resourceMemoryMeta').textContent=formatBytes(mem.usedBytes)+' utilisés / '+formatBytes(mem.totalBytes);document.getElementById('resourceDisk').textContent=disk.available?disk.usedPercent.toFixed(1)+' %':'—';document.getElementById('resourceDiskMeta').textContent=disk.available?formatBytes(disk.freeBytes)+' libres / '+formatBytes(disk.totalBytes):'Mesure indisponible';document.getElementById('resourceUptime').textContent=formatDuration(h.uptimeSeconds);document.getElementById('resourcePlatform').textContent=h.platform;document.getElementById('resourceRuntime').innerHTML=table([{pid:r.pid,uptime:formatDuration(r.uptimeSeconds),RSS:formatBytes(r.memory.rssBytes),'Heap utilisé':formatBytes(r.memory.heapUsedBytes),'Heap total':formatBytes(r.memory.heapTotalBytes),Externe:formatBytes(r.memory.externalBytes)}]);document.getElementById('resourceLimits').innerHTML=table([{CPU:d.configuredLimits.cpuCores+' cœur(s)',RAM:d.configuredLimits.memory,PIDs:d.configuredLimits.pids,'Timeout exécution':d.configuredLimits.executionTimeoutMs+' ms'}]);document.getElementById('resourceDocker').innerHTML=d.docker.available?table(d.docker.containers.map(x=>({conteneur:x.name,CPU:x.cpuPercent===null?'—':x.cpuPercent.toFixed(1)+' %',RAM:formatBytes(x.memoryUsedBytes)+' / '+formatBytes(x.memoryLimitBytes),mémoire:x.memoryPercent===null?'—':x.memoryPercent.toFixed(1)+' %',PIDs:x.pids??'—'}))):'<p class="muted">'+escapeHtml(d.docker.reason||'Docker indisponible')+'</p>';status.className='status-strip'+(d.docker.available?'':' warning');status.textContent='Mesures hôte disponibles · Docker '+(d.docker.available?'accessible':'indisponible');document.getElementById('resourceSampledAt').textContent='Échantillon : '+new Date(h.sampledAt).toLocaleString('fr-FR')+' · CPU calculé entre deux requêtes';}catch(e){status.className='status-strip danger';status.textContent='Erreur de collecte : '+e.message}}

function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}function table(rows){if(!rows.length)return '<p class="muted">Aucune donnée</p>';return '<table><thead><tr>'+Object.keys(rows[0]).map(k=>'<th>'+escapeHtml(k)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+Object.values(r).map(v=>'<td>'+escapeHtml(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
async function refresh(){try{const d=await api('/dashboard');const agents=d.agents;window.__leannaAgents=agents;window.__leannaRole=d.role;window.__leannaTasks=d.tasks;window.__leannaLogs=d.logs||[];document.getElementById('roleLabel').textContent='Rôle : '+(d.role==='admin'?'Administrateur':'Opérateur');document.getElementById('nAgents').textContent=agents.length;renderControlRoom(d);document.getElementById('emergencyButton').hidden=d.role!=='admin';document.getElementById('createAgentOpen').hidden=d.role!=='admin';const emergency=document.getElementById('emergencyButton');emergency.dataset.active=d.emergencyStop?'1':'0';emergency.textContent=d.emergencyStop?'Verrouillage actif · Réarmer':'Arrêt d’urgence';document.getElementById('refresh').textContent=d.emergencyStop?'ARRÊT GLOBAL ACTIF · Live · 5s':'Live · 5s';document.getElementById('nRunning').textContent=agents.filter(a=>a.status==='running').length;document.getElementById('auditOutput').textContent=(d.audit||[]).map(a=>'['+a.at+'] '+a.action+' · '+(a.target||'—')+' · '+a.details).join('\\n');renderAgentDirectory(agents);const select=agents.map(a=>'<option value="'+escapeHtml(a.id)+'">'+escapeHtml(a.name)+' · '+escapeHtml(a.id)+'</option>').join('');document.getElementById('taskAgent').innerHTML=select;const wsAgent=document.getElementById('wsAgent'),previousWsAgent=wsAgent.value;wsAgent.innerHTML=select;if(agents.some(a=>a.id===previousWsAgent))wsAgent.value=previousWsAgent;renderTasks(d.tasks,agents);renderMissions(agents,d.tasks,d.logs);renderOfficeTree(agents,d.tasks);const logFilter=document.getElementById('logFilter'),previousAgent=logFilter.value;logFilter.innerHTML='<option value="">Tous</option>'+select;if(agents.some(a=>a.id===previousAgent))logFilter.value=previousAgent;const eventQuery=new URLSearchParams({limit:'100'}),selectedAgent=logFilter.value,selectedType=document.getElementById('eventTypeFilter').value;if(selectedAgent)eventQuery.set('agentId',selectedAgent);if(selectedType)eventQuery.set('type',selectedType);const eventPage=await api('/events?'+eventQuery.toString());window.__leannaEventLines=eventPage.events.map(e=>'['+e.at+'] '+(e.agentId||'système')+' · '+e.type+' · '+e.level+' · '+e.summary);renderLogOutput();document.getElementById('usageTotal').textContent=fmt(d.usage.total);document.getElementById('usageQuota').textContent=fmt(d.usage.quota);document.getElementById('usageRemaining').textContent=fmt(d.usage.remaining);document.getElementById('usageTable').innerHTML=table(d.usage.byAgent.map(a=>({agent:a.agent_id,tokens:fmt(a.tokens)})));document.getElementById('supTotal').textContent=agents.filter(a=>a.status==='running').length;document.getElementById('supRestarts').textContent=agents.reduce((n,a)=>n+Number(a.restart_count||0),0);document.getElementById('supErrors').textContent=agents.filter(a=>a.last_error).length;document.getElementById('supervisorTable').innerHTML=table(agents.map(a=>({agent:a.id,status:a.status,heartbeat:a.heartbeat_at||'—',restarts:a.restart_count||0,error:a.last_error||'—'})));document.getElementById('lineageTree').textContent=buildTree(agents);document.getElementById('settingsTable').innerHTML=table([{key:'Adresse',value:'127.0.0.1'},{key:'Port',value:'+port+'},{key:'Quota tokens',value:fmt(d.usage.quota)},{key:'Sandbox',value:'Docker · réseau désactivé · limites CPU/mémoire'},{key:'Secrets',value:'Masqués'}]);}catch(e){document.getElementById('refresh').textContent='Erreur: '+e.message}}
const agentStatusLabel=status=>status==='running'?'En mission':status==='failed'?'En erreur':status==='stopped'?'À l’arrêt':status||'Inconnu';
function renderAgentDirectory(agents){
 const running=agents.filter(a=>a.status==='running').length,failed=agents.filter(a=>a.status==='failed'||a.last_error).length,stopped=agents.filter(a=>a.status==='stopped').length;
 document.getElementById('agentsCount').textContent=agents.length;
 document.getElementById('agentsRunning').textContent=running;
 document.getElementById('agentsStopped').textContent=stopped;
 document.getElementById('agentsFailed').textContent=failed;
 const query=(document.getElementById('agentSearch').value||'').trim().toLocaleLowerCase(),status=document.getElementById('agentStatusFilter').value;
 const visible=agents.filter(a=>(status==='all'||a.status===status)&&[a.name,a.id,a.goal].some(value=>String(value||'').toLocaleLowerCase().includes(query)));
 document.getElementById('agentsVisibleCount').textContent=visible.length+' / '+agents.length+' agent(s)';
 const host=document.getElementById('agentTable');
 if(!visible.length){host.innerHTML='<div class="agent-empty">'+(agents.length?'Aucun agent ne correspond aux filtres.':'Aucun agent enregistré. Créez votre premier agent pour commencer.')+'</div>';return;}
 host.innerHTML=visible.map(a=>{
  const state=agentStatusLabel(a.status),heartbeat=a.heartbeat_at?new Date(a.heartbeat_at).toLocaleString('fr-FR'):'Aucun signal',created=a.created_at?new Date(a.created_at).toLocaleDateString('fr-FR'):'—';
  const initial=escapeHtml((a.name||'?').trim().slice(0,1).toLocaleUpperCase());
  const start=a.status!=='running';
  return '<article class="agent-card"><div class="agent-card-top"><div class="agent-card-title"><div class="agent-avatar">'+initial+'</div><div><h4>'+escapeHtml(a.name)+'</h4><div class="agent-card-id">'+escapeHtml(a.id)+'</div></div></div><span class="agent-state '+escapeHtml(a.status)+'">'+escapeHtml(state)+'</span></div><p class="agent-goal">'+escapeHtml(a.goal)+'</p><div class="agent-info-grid"><div class="agent-info"><span>Dernier heartbeat</span><strong>'+escapeHtml(heartbeat)+'</strong></div><div class="agent-info"><span>Créé le</span><strong>'+escapeHtml(created)+'</strong></div><div class="agent-info"><span>Redémarrages</span><strong>'+escapeHtml(a.restart_count??0)+'</strong></div><div class="agent-info"><span>Agent parent</span><strong>'+escapeHtml(a.parent_id||'Racine')+'</strong></div></div>'+(a.last_error?'<div class="agent-error"><b>Dernière erreur</b><br>'+escapeHtml(a.last_error)+'</div>':'')+'<div class="agent-card-actions">'+(window.__leannaRole==='admin'?'<button class="action secondary" data-action="edit" data-agent-id="'+escapeHtml(a.id)+'">Modifier</button><button class="action danger" data-action="delete" data-agent-id="'+escapeHtml(a.id)+'">Supprimer</button>':'')+(start?'<button class="action" data-action="start" data-agent-id="'+escapeHtml(a.id)+'">Démarrer</button>':'<button class="action danger" data-action="stop" data-agent-id="'+escapeHtml(a.id)+'">Arrêter</button>')+'<button class="action secondary" data-action="details" data-agent-id="'+escapeHtml(a.id)+'">Voir la fiche</button></div></article>';
 }).join('');
 host.querySelectorAll('button[data-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.action,id=button.dataset.agentId;if(action==='details')showDetail(id);else if(action==='edit')openEditAgent(id);else if(action==='delete')deleteAgent(id);else act(action,id)}));
}
document.getElementById('agentSearch').addEventListener('input',()=>{const cached=window.__leannaAgents||[];renderAgentDirectory(cached)});
document.getElementById('agentStatusFilter').addEventListener('change',()=>{const cached=window.__leannaAgents||[];renderAgentDirectory(cached)});
document.getElementById('taskSearch').addEventListener('input',()=>renderTasks(window.__leannaTasks||[],window.__leannaAgents||[]));
document.getElementById('taskStatusFilter').addEventListener('change',()=>renderTasks(window.__leannaTasks||[],window.__leannaAgents||[]));
document.getElementById('logSearch').addEventListener('input',renderLogOutput);
function renderControlRoom(d){
 const agents=d.agents||[],tasks=d.tasks||[],logs=d.logs||[];
 const now=Date.now(),staleMs=90000;
 const running=agents.filter(a=>a.status==='running');
 const activeTasks=tasks.filter(t=>t.status==='active');
 const pendingTasks=tasks.filter(t=>t.status==='pending');
 const failedAgents=agents.filter(a=>a.status==='failed'||a.last_error);
 const staleAgents=running.filter(a=>{const timestamp=a.heartbeat_at?Date.parse(a.heartbeat_at):NaN;return !Number.isFinite(timestamp)||now-timestamp>staleMs;});
 const activeWithoutRuntime=activeTasks.filter(t=>!agents.some(a=>a.id===t.agent_id&&a.status==='running'));
 const alerts=[];
 failedAgents.forEach(a=>alerts.push({level:'danger',title:'Agent en erreur · '+a.name,detail:a.last_error||'Statut failed'}));
 staleAgents.forEach(a=>alerts.push({level:'warning',title:'Heartbeat en retard · '+a.name,detail:a.heartbeat_at?'Dernier signal : '+new Date(a.heartbeat_at).toLocaleString('fr-FR'):'Aucun heartbeat enregistré'}));
 activeWithoutRuntime.forEach(t=>alerts.push({level:'warning',title:'Tâche active sans agent actif',detail:t.title+' · '+t.agent_id}));
 if((d.taskCounts?.failed??0)>0)alerts.push({level:'danger',title:'Tâches en échec',detail:(d.taskCounts.failed)+' tâche(s) ont échoué et nécessitent une revue.'});
 if(d.emergencyStop)alerts.unshift({level:'danger',title:'Arrêt d’urgence global actif',detail:'Les démarrages sont verrouillés jusqu’au réarmement administrateur.'});
 document.getElementById('nTasksActive').textContent=d.taskCounts?.active??activeTasks.length;
 document.getElementById('nAttention').textContent=alerts.length;
 const health=document.getElementById('systemHealth'),banner=document.getElementById('systemBanner');
 const healthState=agents.length===0?'unknown':d.emergencyStop||failedAgents.length?'danger':alerts.length?'warning':'healthy';
 health.className='health-pill '+(healthState==='healthy'?'':healthState);
 health.textContent=healthState==='healthy'?'Aucune alerte':healthState==='warning'?'À surveiller':healthState==='unknown'?'Données insuffisantes':'Intervention requise';
 banner.className='status-strip'+(healthState==='healthy'?'':healthState==='danger'?' danger':healthState==='unknown'?' unknown':' warning');
 banner.textContent=d.emergencyStop?'Arrêt global actif · Les agents ne peuvent pas être démarrés.':healthState==='danger'?'Des erreurs agent nécessitent une intervention.':healthState==='warning'?'Des anomalies de heartbeat ou de cohérence nécessitent une vérification.':healthState==='unknown'?'Aucun agent enregistré : état global non déterminé.':'Centre de contrôle opérationnel · aucune alerte détectée.';
 document.getElementById('controlHealth').innerHTML=[
  ['Agents actifs',running.length+' / '+agents.length],
  ['Tâches actives',d.taskCounts?.active??activeTasks.length],
  ['Tâches en attente',d.taskCounts?.pending??pendingTasks.length],
  ['Agents en erreur',failedAgents.length],
  ['Heartbeats en retard',staleAgents.length],
  ['Arrêt d’urgence',d.emergencyStop?'ACTIF':'Inactif']
 ].map(x=>'<div class="control-health-row"><span>'+escapeHtml(x[0])+'</span><span>'+escapeHtml(x[1])+'</span></div>').join('');
 document.getElementById('alertCount').textContent=alerts.length;
 document.getElementById('controlAlerts').innerHTML=alerts.length?alerts.slice(0,8).map(a=>'<div class="control-alert '+a.level+'"><strong>'+escapeHtml(a.title)+'</strong><p>'+escapeHtml(a.detail)+'</p></div>').join(''):'<div class="control-empty">Aucune intervention requise selon les données disponibles.</div>';
 const agentRows=running.map(a=>{
  const task=activeTasks.find(t=>t.agent_id===a.id);
  const heartbeat=a.heartbeat_at&&Number.isFinite(Date.parse(a.heartbeat_at))?new Date(a.heartbeat_at).toLocaleString('fr-FR'):'Inconnu';
  const heartbeatTime=a.heartbeat_at?Date.parse(a.heartbeat_at):NaN;
  const late=!Number.isFinite(heartbeatTime)||now-heartbeatTime>staleMs;
  return {agent:'<button class="agent-link" data-open-agent="'+escapeHtml(a.id)+'">'+escapeHtml(a.name)+'</button>',mission:escapeHtml(a.goal),tache:escapeHtml(task?.title||'Aucune tâche active'),heartbeat:escapeHtml(heartbeat+(late?' · en retard':''))};
 });
 document.getElementById('overviewAgents').innerHTML=agentRows.length?'<table><thead><tr><th>Agent</th><th>Mission</th><th>Tâche</th><th>Heartbeat</th></tr></thead><tbody>'+agentRows.map(r=>'<tr><td>'+r.agent+'</td><td>'+r.mission+'</td><td>'+r.tache+'</td><td>'+r.heartbeat+'</td></tr>').join('')+'</tbody></table>':'<div class="control-empty">Aucun agent actuellement en mission.</div>';
 document.querySelectorAll('[data-open-agent]').forEach(b=>b.addEventListener('click',()=>showDetail(b.dataset.openAgent)));
 document.getElementById('controlActivity').innerHTML=logs.length?logs.slice(0,12).map(l=>'<div class="activity-row"><div class="activity-time">'+escapeHtml(new Date(l.at).toLocaleString('fr-FR'))+'</div><div class="activity-message"><b>'+escapeHtml(l.agent_id)+'</b> · '+escapeHtml(l.level)+' · '+escapeHtml(l.message)+'</div></div>').join(''):'<div class="control-empty">Aucun événement enregistré.</div>';
 document.getElementById('controlUpdated').textContent='Dernière actualisation : '+new Date().toLocaleTimeString('fr-FR');
}

function renderOfficeTree(agents,tasks){
 const host=document.getElementById('officeTree');if(!host)return;
 const active=tasks.filter(t=>t.status==='active'),pending=tasks.filter(t=>t.status==='pending');
 document.getElementById('officeAgentCount').textContent=agents.length;
 document.getElementById('officeRunningCount').textContent=agents.filter(a=>a.status==='running').length;
 document.getElementById('officeActiveTasks').textContent=active.length;
 document.getElementById('officePendingTasks').textContent=pending.length;
 document.getElementById('officeUpdated').textContent='Mis à jour à '+new Date().toLocaleTimeString('fr-FR');
 if(!agents.length){host.innerHTML='<div class="office-empty"><strong>Le bureau est encore vide</strong><p>Créez votre premier agent : il apparaîtra ici avec son poste et ses missions.</p><button class="action" onclick="page(\'agents\',document.querySelector(\'nav button[onclick*=agents]\'))">Créer un premier agent</button></div>';return;}
 const byId=new Map(agents.map(a=>[a.id,a])),children=new Map(),taskByAgent=new Map();
 agents.forEach(a=>{if(a.parent_id&&byId.has(a.parent_id)){if(!children.has(a.parent_id))children.set(a.parent_id,[]);children.get(a.parent_id).push(a)}});
 tasks.forEach(t=>{if(!taskByAgent.has(t.agent_id))taskByAgent.set(t.agent_id,[]);taskByAgent.get(t.agent_id).push(t)});
 const visited=new Set(),tones=new Map(agents.map((a,i)=>[a.id,i%6]));
 const node=a=>{
  if(visited.has(a.id))return '';visited.add(a.id);
  const assigned=taskByAgent.get(a.id)||[],task=assigned.find(t=>t.status==='active')||assigned.find(t=>t.status==='pending')||assigned[0];
  const state=a.status==='running'?'En mission':a.status==='failed'?'En erreur':a.status==='stopped'?'À l’arrêt':a.status||'Inconnu';
  const initials=escapeHtml((a.name||'?').trim().slice(0,2).toLocaleUpperCase());
  const childNodes=(children.get(a.id)||[]).filter(c=>!visited.has(c.id)).map(node).join('');
  return '<li class="office-branch" role="treeitem" aria-label="'+escapeHtml(a.name)+' · '+escapeHtml(state)+'"><button type="button" class="office-desk '+escapeHtml(a.status)+' office-tone-'+tones.get(a.id)+'" data-office-agent="'+escapeHtml(a.id)+'" aria-label="Ouvrir la fiche de '+escapeHtml(a.name)+'"><span class="office-person" aria-hidden="true"><i class="office-hair"></i><i class="office-head"></i><i class="office-eye"></i><i class="office-body"></i><i class="office-arm"></i><i class="office-arm right"></i><i class="office-legs"></i></span><span class="office-agent-name">'+escapeHtml(a.name)+'</span><span class="office-agent-role">'+initials+' · '+escapeHtml(a.goal||'Mission non définie')+'</span><span class="office-agent-state">'+escapeHtml(state)+'</span><span class="office-task"><small>'+(task?(task.status==='active'?'Tâche en cours':task.status==='pending'?'Prochaine tâche':'Dernière tâche'):'Aucune tâche')+'</small><strong>'+escapeHtml(task?.title||'En attente d’une mission')+'</strong><em>'+escapeHtml(task?.status||'Disponible')+' · '+assigned.length+' tâche(s)</em></span></button>'+(childNodes?'<ul class="office-children" role="group">'+childNodes+'</ul>':'')+'</li>';
 };
 let roots=agents.filter(a=>!a.parent_id||!byId.has(a.parent_id));if(!roots.length)roots=agents.slice(0,1);
 const rootHtml=roots.map(node).join(''),orphanHtml=agents.filter(a=>!visited.has(a.id)).map(node).join('');
 host.innerHTML='<ul class="office-forest" role="group">'+rootHtml+orphanHtml+'</ul>';
 host.querySelectorAll('[data-office-agent]').forEach(button=>button.addEventListener('click',()=>showDetail(button.dataset.officeAgent)));
}

function renderTasks(tasks,agents){
 const host=document.getElementById('taskTable');if(!host)return;
 const names=new Map(agents.map(a=>[a.id,a.name]));
 const query=(document.getElementById('taskSearch')?.value||'').trim().toLocaleLowerCase();
 const statusFilter=document.getElementById('taskStatusFilter')?.value||'all';
 const visible=tasks.filter(t=>(statusFilter==='all'||t.status===statusFilter)&&[t.title,t.description,t.agent_id,names.get(t.agent_id)].some(value=>String(value||'').toLocaleLowerCase().includes(query)));
 const counter=document.getElementById('taskVisibleCount');if(counter)counter.textContent=visible.length+' / '+tasks.length+' tâche(s)';
 if(!visible.length){host.innerHTML='<div class="mission-empty">'+(tasks.length?'Aucune tâche ne correspond aux filtres.':'Aucune tâche enregistrée.')+'</div>';return;}
 const admin=window.__leannaRole==='admin';
 host.innerHTML='<div class="task-table">'+visible.map(t=>{
  const active=t.status==='active';
  const status=t.status==='pending'?'En attente':t.status==='active'?'En cours':t.status==='completed'?'Terminée':t.status==='failed'?'En erreur':t.status;
  return '<article class="task-row"><div><h4>'+escapeHtml(t.title)+'</h4><p>'+escapeHtml(t.description||'Aucune description')+'</p><div class="task-row-meta"><span>'+escapeHtml(names.get(t.agent_id)||t.agent_id)+'</span><span>'+escapeHtml(status)+'</span><span>'+escapeHtml(t.updated_at||t.created_at||'')+'</span></div></div><div class="task-actions">'+(admin?'<button class="action secondary" data-task-edit="'+escapeHtml(t.id)+'" '+(active?'disabled title="Une tâche active ne peut pas être modifiée"':'')+'>Modifier</button><button class="action danger" data-task-delete="'+escapeHtml(t.id)+'" '+(active?'disabled title="Une tâche active ne peut pas être supprimée"':'')+'>Supprimer</button>':'')+'</div></article>';
 }).join('')+'</div>';
 host.querySelectorAll('[data-task-edit]').forEach(b=>b.addEventListener('click',()=>openTaskEdit(b.dataset.taskEdit)));
 host.querySelectorAll('[data-task-delete]').forEach(b=>b.addEventListener('click',()=>deleteTask(b.dataset.taskDelete)));
}
function renderLogOutput(){
 const lines=window.__leannaEventLines||[],query=(document.getElementById('logSearch')?.value||'').trim().toLocaleLowerCase();
 const visible=query?lines.filter(line=>line.toLocaleLowerCase().includes(query)):lines;
 const counter=document.getElementById('logVisibleCount');if(counter)counter.textContent=visible.length+' / '+lines.length+' événement(s) · recherche sur les 100 chargés';
 document.getElementById('logOutput').textContent=visible.join('\n');
}
let editingTaskId=null,editingMissionAgentId=null;
const taskEditModal=document.getElementById('taskEditModal'),missionEditModal=document.getElementById('missionEditModal');
function openTaskEdit(id){
 const task=(window.__leannaTasks||[]).find(t=>t.id===id);if(!task||task.status==='active')return;
 editingTaskId=id;document.getElementById('taskEditTitleInput').value=task.title||'';
 document.getElementById('taskEditDescription').value=task.description||'';
 document.getElementById('taskEditError').hidden=true;taskEditModal.hidden=false;document.body.style.overflow='hidden';
 document.getElementById('taskEditTitleInput').focus();
}
function closeTaskEdit(){taskEditModal.hidden=true;document.body.style.overflow='';editingTaskId=null}
async function deleteTask(id){
 const task=(window.__leannaTasks||[]).find(t=>t.id===id);if(!task||task.status==='active')return;
 if(!confirm('Supprimer la tâche « '+task.title+' » ? Cette action est définitive.'))return;
 try{await api('/tasks/'+encodeURIComponent(id),{method:'DELETE',body:JSON.stringify({})});await refresh()}catch(error){alert(error.message)}
}
taskEditModal.querySelectorAll('[data-close-task-modal]').forEach(b=>b.addEventListener('click',closeTaskEdit));
document.getElementById('taskEditForm').onsubmit=async e=>{
 e.preventDefault();if(!editingTaskId)return;
 const error=document.getElementById('taskEditError'),submit=e.target.querySelector('button[type="submit"]');
 submit.disabled=true;error.hidden=true;
 try{await api('/tasks/'+encodeURIComponent(editingTaskId),{method:'PATCH',body:JSON.stringify({title:document.getElementById('taskEditTitleInput').value.trim(),description:document.getElementById('taskEditDescription').value})});closeTaskEdit();await refresh()}
 catch(err){error.textContent=err.message;error.hidden=false}
 finally{submit.disabled=false}
};
function openMissionEdit(id){
 const agent=(window.__leannaAgents||[]).find(a=>a.id===id);if(!agent||agent.status==='running')return;
 editingMissionAgentId=id;document.getElementById('missionEditAgent').textContent=agent.name;
 document.getElementById('missionEditGoal').value=agent.goal||'';
 document.getElementById('missionEditError').hidden=true;missionEditModal.hidden=false;document.body.style.overflow='hidden';
 document.getElementById('missionEditGoal').focus();
}
function closeMissionEdit(){missionEditModal.hidden=true;document.body.style.overflow='';editingMissionAgentId=null}
async function deleteMission(id){
 const agent=(window.__leannaAgents||[]).find(a=>a.id===id);if(!agent||agent.status==='running')return;
 if(!confirm('Supprimer la mission de « '+agent.name+' » ? L’agent sera conservé, mais son objectif sera effacé.'))return;
 try{await api('/agents/'+encodeURIComponent(id)+'/mission',{method:'DELETE',body:JSON.stringify({})});await refresh()}catch(error){alert(error.message)}
}
missionEditModal.querySelectorAll('[data-close-mission-modal]').forEach(b=>b.addEventListener('click',closeMissionEdit));
document.getElementById('missionEditForm').onsubmit=async e=>{
 e.preventDefault();if(!editingMissionAgentId)return;
 const error=document.getElementById('missionEditError'),submit=e.target.querySelector('button[type="submit"]');
 submit.disabled=true;error.hidden=true;
 try{await api('/agents/'+encodeURIComponent(editingMissionAgentId)+'/mission',{method:'PATCH',body:JSON.stringify({goal:document.getElementById('missionEditGoal').value.trim()})});closeMissionEdit();await refresh()}
 catch(err){error.textContent=err.message;error.hidden=false}
 finally{submit.disabled=false}
};
function renderMissions(agents,tasks,logs){
 const filter=document.getElementById('missionFilter')?.value||'all',query=(document.getElementById('missionSearch')?.value||'').trim().toLocaleLowerCase();
 const activeTasks=tasks.filter(t=>t.status==='active'),pendingTasks=tasks.filter(t=>t.status==='pending');
 document.getElementById('missionRunning').textContent=agents.filter(a=>a.status==='running').length;
 document.getElementById('missionTasksActive').textContent=activeTasks.length;
 document.getElementById('missionTasksPending').textContent=pendingTasks.length;
 document.getElementById('missionFailed').textContent=agents.filter(a=>a.status==='failed'||a.last_error).length;
 const visible=agents.filter(a=>(filter==='all'||a.status===filter)&&[a.name,a.id,a.goal,...tasks.filter(t=>t.agent_id===a.id).flatMap(t=>[t.title,t.description])].some(value=>String(value||'').toLocaleLowerCase().includes(query)));
 const board=document.getElementById('missionBoard');
 const count=document.getElementById('missionVisibleCount');if(count)count.textContent=visible.length+' / '+agents.length+' agent(s)';
 if(!visible.length){board.innerHTML='<div class="mission-empty">'+(agents.length?'Aucun agent ne correspond aux filtres.':'Aucun agent enregistré.')+'</div>';return;}
 board.innerHTML=visible.map(a=>{
  const agentTasks=tasks.filter(t=>t.agent_id===a.id);
  const task=agentTasks.find(t=>t.status==='active')||agentTasks.find(t=>t.status==='pending');
  const last=logs.find(l=>l.agent_id===a.id);
  const state=a.status==='running'?'En mission':a.status==='failed'?'En erreur':a.status==='stopped'?'À l’arrêt':a.status;
  const heartbeat=a.heartbeat_at?new Date(a.heartbeat_at).toLocaleString('fr-FR'):'Aucun heartbeat';
  const taskLabel=task?(task.status==='active'?'Tâche active':'Prochaine tâche'):'Aucune tâche assignée';
  return '<article class="mission-card"><div class="mission-head"><h4>'+escapeHtml(a.name)+'</h4> <span class="badge">'+escapeHtml(state)+'</span></div><p class="mission-goal">'+escapeHtml(a.goal)+'</p><div class="mission-meta"><span>'+escapeHtml(a.id)+'</span><span>'+escapeHtml(heartbeat)+'</span><span>'+agentTasks.length+' tâche(s)</span></div><div class="mission-task"><small class="muted">'+taskLabel+'</small><div><b>'+escapeHtml(task?.title||'En attente d’une tâche')+'</b></div><p>'+escapeHtml(task?.description||'Cet agent ne possède pas de tâche active ou en attente.')+'</p></div><p><small class="muted">Dernière activité</small><br>'+escapeHtml(last?(last.level+' · '+last.message+' · '+last.at):'Aucune activité enregistrée')+'</p>'+(a.last_error?'<p style="color:#ef6478">Erreur : '+escapeHtml(a.last_error)+'</p>':'')+'<div class="mission-actions"><button class="action" data-mission-action="details" data-agent-id="'+escapeHtml(a.id)+'">Ouvrir</button>'+(a.status==='running'?'<button class="action danger" data-mission-action="stop" data-agent-id="'+escapeHtml(a.id)+'">Arrêter</button>':'<button class="action" data-mission-action="start" data-agent-id="'+escapeHtml(a.id)+'">Démarrer</button>')+(window.__leannaRole==='admin'?'<button class="action secondary" data-mission-edit="'+escapeHtml(a.id)+'" '+(a.status==='running'?'disabled title="Arrêtez l’agent pour modifier sa mission"':'')+'>'+(a.goal?'Modifier la mission':'Définir une mission')+'</button>'+(a.goal?'<button class="action danger" data-mission-delete="'+escapeHtml(a.id)+'" '+(a.status==='running'?'disabled title="Arrêtez l’agent pour supprimer sa mission"':'')+'>Supprimer la mission</button>':''):'')+'</div></article>';
 }).join('');
 board.querySelectorAll('button[data-mission-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.missionAction,id=button.dataset.agentId;if(action==='details')showDetail(id);else act(action,id);}));
 board.querySelectorAll('[data-mission-edit]').forEach(b=>b.addEventListener('click',()=>openMissionEdit(b.dataset.missionEdit)));
 board.querySelectorAll('[data-mission-delete]').forEach(b=>b.addEventListener('click',()=>deleteMission(b.dataset.missionDelete)));
}
document.getElementById('missionFilter').addEventListener('change',()=>refresh());
document.getElementById('missionSearch').addEventListener('input',()=>renderMissions(window.__leannaAgents||[],window.__leannaTasks||[],window.__leannaLogs||[]));
function buildTree(agents){const roots=agents.filter(a=>!a.parent_id||!agents.some(p=>p.id===a.parent_id));const out=[];function walk(a,n){out.push('  '.repeat(n)+'- '+escapeHtml(a.name)+' ['+escapeHtml(a.status)+'] '+a.id);agents.filter(c=>c.parent_id===a.id).forEach(c=>walk(c,n+1))}roots.forEach(a=>walk(a,0));return out.join('\\n')||'Aucun agent'}function showDetail(id){api('/agents/'+encodeURIComponent(id)).then(d=>{page('detail');document.getElementById('agentDetail').innerHTML='<h2>'+escapeHtml(d.agent.name)+'</h2><p>'+escapeHtml(d.agent.goal)+'</p>'+table([{id:d.agent.id,status:d.agent.status,heartbeat:d.agent.heartbeat_at||'—',restarts:d.agent.restart_count||0,parent:d.agent.parent_id||'—',error:d.agent.last_error||'—'}])+'<h3>Logs</h3><pre>'+d.logs.map(l=>escapeHtml('['+l.at+'] '+l.level+' '+l.message)).join('\\n')+'</pre><h3>Tâches</h3>'+table(d.tasks.map(t=>({title:t.title,status:t.status,updated:t.updated_at})));}).catch(e=>alert(e.message))}let workspacePath='';
let workspaceEntries=[];
function workspaceStatus(message,kind='unknown'){const el=document.getElementById('wsStatus');el.className='status-strip '+kind;el.textContent=message}
function workspaceBytes(value){if(value<1024)return value+' o';if(value<1048576)return (value/1024).toFixed(1)+' Kio';return (value/1048576).toFixed(1)+' Mio'}
function renderWorkspaceBreadcrumb(){const root='<button data-ws-path="">/workspace</button>';const parts=workspacePath?workspacePath.split('/'):[];let current='';const crumbs=parts.map(part=>{current=current?current+'/'+part:part;return '<span>›</span><button data-ws-path="'+escapeHtml(current)+'">'+escapeHtml(part)+'</button>'});document.getElementById('wsBreadcrumb').innerHTML=root+crumbs.join('');document.querySelectorAll('[data-ws-path]').forEach(button=>button.addEventListener('click',()=>loadWorkspace(button.dataset.wsPath||'')))}
function renderWorkspaceEntries(){const query=(document.getElementById('wsSearch').value||'').trim().toLocaleLowerCase();const visible=workspaceEntries.filter(entry=>entry.name.toLocaleLowerCase().includes(query));document.getElementById('wsCount').textContent=visible.length+' / '+workspaceEntries.length;const host=document.getElementById('wsEntries');if(!visible.length){host.innerHTML='<div class="control-empty">'+(workspaceEntries.length?'Aucun résultat pour cette recherche.':'Ce dossier est vide.')+'</div>';return}host.innerHTML=visible.map(entry=>{const folder=entry.type==='directory',file=entry.type==='file',icon=folder?'▰':file?'▤':entry.type==='symlink'?'↗':'·';const action=folder?'data-ws-dir="'+escapeHtml(entry.path)+'"':file?'data-ws-file="'+escapeHtml(entry.path)+'"':'';const label=folder?'Ouvrir le dossier':file?'Afficher le fichier':'Élément non ouvrable';return '<div class="workspace-entry"><span class="entry-icon">'+icon+'</span><button '+action+' title="'+label+'" '+(!folder&&!file?'disabled':'')+'>'+escapeHtml(entry.name)+'</button><span class="entry-meta">'+(file?workspaceBytes(entry.sizeBytes):folder?'Dossier':entry.type==='symlink'?'Lien symbolique':'—')+'</span></div>'}).join('');host.querySelectorAll('[data-ws-dir]').forEach(button=>button.addEventListener('click',()=>loadWorkspace(button.dataset.wsDir)));host.querySelectorAll('[data-ws-file]').forEach(button=>button.addEventListener('click',()=>previewWorkspaceFile(button.dataset.wsFile)))}
async function loadWorkspace(path=workspacePath){const id=document.getElementById('wsAgent').value;if(!id){workspaceStatus('Aucun agent sélectionné.','unknown');return}workspaceStatus('Lecture du dossier…');document.getElementById('wsEntries').innerHTML='<div class="control-empty">Chargement…</div>';document.getElementById('wsOutput').textContent='Sélectionnez un fichier pour afficher son contenu.';document.getElementById('wsPreviewTitle').textContent='Aperçu du fichier';document.getElementById('wsPreviewMeta').textContent='—';try{const d=await api('/agents/'+encodeURIComponent(id)+'/workspace?path='+encodeURIComponent(path));workspacePath=d.path;workspaceEntries=d.entries;renderWorkspaceBreadcrumb();renderWorkspaceEntries();workspaceStatus(d.entries.length+' élément(s) dans /workspace'+(d.path?'/'+d.path:''),'');}catch(e){workspaceEntries=[];renderWorkspaceEntries();workspaceStatus(e.message,'warning')}}
async function previewWorkspaceFile(path){const id=document.getElementById('wsAgent').value;workspaceStatus('Lecture du fichier…');try{const d=await api('/agents/'+encodeURIComponent(id)+'/workspace/file?path='+encodeURIComponent(path));document.getElementById('wsPreviewTitle').textContent=d.path;document.getElementById('wsPreviewMeta').textContent=workspaceBytes(d.sizeBytes);document.getElementById('wsOutput').textContent=d.content;workspaceStatus('Aperçu chargé · '+workspaceBytes(d.sizeBytes),'');}catch(e){workspaceStatus(e.message,'warning')}}
async function act(action,id){try{await api('/agents/'+encodeURIComponent(id)+'/'+action,{method:'POST'});refresh()}catch(e){alert(e.message)}}
const agentModal=document.getElementById('createAgentModal'),agentModalOpen=document.getElementById('createAgentOpen'),agentForm=document.getElementById('createAgent'),agentFormError=document.getElementById('createAgentError');
let editingAgentId=null;
function openAgentModal(){editingAgentId=null;agentForm.reset();document.getElementById('createAgentTitle').textContent='Créer un agent';document.getElementById('createAgentDescription').textContent='Définissez son identité et la mission qu’il devra poursuivre.';agentForm.querySelector('button[type="submit"]').textContent='Créer l’agent';agentFormError.hidden=true;agentFormError.textContent='';agentModal.hidden=false;document.body.style.overflow='hidden';document.getElementById('agentName').focus()}
function openEditAgent(id){const agent=(window.__leannaAgents||[]).find(item=>item.id===id);if(!agent)return;editingAgentId=id;document.getElementById('agentName').value=agent.name||'';document.getElementById('agentGoal').value=agent.goal||'';document.getElementById('createAgentTitle').textContent='Modifier l’agent';document.getElementById('createAgentDescription').textContent='Modifiez le nom et la mission. L’identifiant et l’identité cryptographique restent inchangés.';agentForm.querySelector('button[type="submit"]').textContent='Enregistrer';agentFormError.hidden=true;agentFormError.textContent='';agentModal.hidden=false;document.body.style.overflow='hidden';document.getElementById('agentName').focus()}
function closeAgentModal(){agentModal.hidden=true;document.body.style.overflow='';editingAgentId=null;agentModalOpen.focus()}
async function deleteAgent(id){const agent=(window.__leannaAgents||[]).find(item=>item.id===id);if(!agent)return;if(!confirm('Supprimer définitivement « '+agent.name+' » ? Cette action supprime aussi sa sandbox et son workspace. Elle est refusée si l’agent est actif, possède des enfants ou des tâches.'))return;try{await api('/agents/'+encodeURIComponent(id),{method:'DELETE'});await refresh()}catch(error){alert(error.message)}}
agentModalOpen.addEventListener('click',openAgentModal);
agentModal.querySelectorAll('[data-close-agent-modal]').forEach(button=>button.addEventListener('click',closeAgentModal));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!agentModal.hidden)closeAgentModal()});document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!taskEditModal.hidden)closeTaskEdit();if(!missionEditModal.hidden)closeMissionEdit()}});
agentForm.onsubmit=async e=>{e.preventDefault();const submit=agentForm.querySelector('button[type="submit"]'),wasEditing=Boolean(editingAgentId),target=editingAgentId;submit.disabled=true;submit.textContent='Enregistrement…';agentFormError.hidden=true;try{const payload={name:document.getElementById('agentName').value.trim(),goal:document.getElementById('agentGoal').value.trim()};await api(wasEditing?'/agents/'+encodeURIComponent(target):'/agents',{method:wasEditing?'PATCH':'POST',body:JSON.stringify(payload)});agentForm.reset();closeAgentModal();await refresh()}catch(error){agentFormError.textContent=error.message;agentFormError.hidden=false}finally{submit.disabled=false;submit.textContent=editingAgentId?'Enregistrer':'Créer l’agent'}};
document.getElementById('createTask').onsubmit=async e=>{e.preventDefault();try{await api('/tasks',{method:'POST',body:JSON.stringify({agent:taskAgent.value,title:taskTitle.value,description:taskDesc.value})});e.target.reset();refresh()}catch(e){alert(e.message)}};
document.getElementById('loginForm').onsubmit=async e=>{e.preventDefault();const token=document.getElementById('authToken').value;try{await api('/auth',{method:'POST',body:JSON.stringify({token})});sessionStorage.setItem('leanna_ui_token',token);document.getElementById('authGate').style.display='none';document.getElementById('authError').textContent='';refresh()}catch(err){document.getElementById('authError').textContent='Échec de connexion: '+err.message}};if(sessionStorage.getItem('leanna_ui_token')){document.getElementById('authGate').style.display='none';refresh()}setInterval(()=>{if(sessionStorage.getItem('leanna_ui_token'))refresh()},5000);
</script></body></html>`;

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
 if(pathname==="/api/dashboard"){const agents=db.prepare("SELECT id,name,goal,parent_id,status,created_at,heartbeat_at,restart_count,last_error FROM agents ORDER BY created_at DESC").all() as any[];const tasks=db.prepare("SELECT * FROM tasks ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,created_at DESC LIMIT 200").all();const taskCounts=db.prepare("SELECT status,COUNT(*) AS count FROM tasks GROUP BY status").all() as {status:string;count:number}[];const taskSummary={active:taskCounts.find(x=>x.status==="active")?.count??0,pending:taskCounts.find(x=>x.status==="pending")?.count??0,failed:taskCounts.find(x=>x.status==="failed")?.count??0,completed:taskCounts.find(x=>x.status==="completed")?.count??0,total:taskCounts.reduce((n,x)=>n+x.count,0)};const logs=db.prepare("SELECT agent_id,at,level,message FROM logs ORDER BY id DESC LIMIT 100").all() as any[];const total=(db.prepare("SELECT COALESCE(SUM(tokens),0) total FROM usage").get() as any).total;const byAgent=db.prepare("SELECT agent_id,SUM(tokens) tokens FROM usage GROUP BY agent_id ORDER BY tokens DESC").all();const quota=Math.max(0,Number(process.env.INFERENCE_QUOTA??100000));const auditRows=db.prepare("SELECT at,action,target,details FROM audit ORDER BY id DESC LIMIT 100").all();return send(200,{agents,tasks,taskCounts:taskSummary,logs,audit:auditRows,emergencyStop:emergencyStopActive(),role,usage:{total,quota,remaining:Math.max(0,quota-total),byAgent}});}
 if(pathname==="/api/agents"&&req.method==="POST"){const name=String(body.name||"").trim(),goal=String(body.goal||"").trim();if(!name||!goal)return send(400,{error:"Nom et objectif requis"});const id=name.toLowerCase().replace(/[^a-z0-9-]/g,"-")+"-"+randomUUID().slice(0,8),created=new Date().toISOString(),identity=createIdentity();db.prepare("INSERT INTO agents(id,name,goal,parent_id,status,created_at,identity,constitution_hash,version) VALUES(?,?,?,?,?,?,?,?,?)").run(id,name,goal,null,"stopped",created,identity,constitutionHash(),"0.1.0");log(id,"genesis","Mission: "+goal);audit("agent.create",id,"Agent créé depuis la console");return send(201,{id});}
 const startMatch=pathname.match(/^\/api\/agents\/([^/]+)\/start$/);if(startMatch&&req.method==="POST"){const id=decodeURIComponent(startMatch[1]);if(emergencyStopActive())return send(423,{error:"Arrêt d’urgence actif. Réarmez le système avant de démarrer un agent."});if(!db.prepare("SELECT id FROM agents WHERE id=?").get(id))return send(404,{error:"Agent introuvable"});audit("agent.start",id,"Démarrage demandé depuis la console");try{const runtime=startAgent(id);runtime.catch(e=>{log(id,"ui-error",String(e).slice(0,1000));});return send(202,{ok:true});}catch(e){return send(409,{error:e instanceof Error?e.message:"Démarrage refusé"});}}
 const stopMatch=pathname.match(/^\/api\/agents\/([^/]+)\/stop$/);if(stopMatch&&req.method==="POST"){const id=decodeURIComponent(stopMatch[1]);db.prepare("UPDATE agents SET status='stopped',heartbeat_at=NULL,runtime_owner=NULL WHERE id=?").run(id);await stopSandbox(id);log(id,"system","Stopped via dashboard");audit("agent.stop",id,"Arrêt demandé depuis la console");return send(200,{ok:true});}

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
