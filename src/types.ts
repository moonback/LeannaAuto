export type AgentStatus = "running" | "stopped" | "suspended";
export interface Agent {
 id: string; name: string; goal: string; parentId: string | null; status: AgentStatus;
 createdAt: string; identity: string; constitutionHash: string; version: string;
}
export interface ToolResult { output: string; usage?: { tokens?: number }; }
export interface ToolCall { name: string; arguments: Record<string, unknown>; }
export interface LLMMessage { role: "system"|"user"|"assistant"|"tool"; content: string; }
