# Security notes

LeannaAuto is a prototype, not a secure multi-tenant service.

## Sandbox assumptions
- Docker is a host-level trust boundary; anyone controlling its socket can effectively control the host.
- Agent commands execute as UID 1000 inside the container.
- The container drops Linux capabilities, sets no-new-privileges, uses a read-only root filesystem, limits CPU/memory/PIDs, and has no network by default.
- The workspace volume is writable and intentionally permissive to allow UID 1000 writes.
- The container's startup process is still root for workspace setup. This is not equivalent to a rootless Docker deployment.
- Do not mount secrets, home directories, host files, or the Docker socket inside an agent container.

## Constitution
The command filter is a best-effort heuristic. It is not a security boundary and can be bypassed through shell syntax, scripts, or tool behavior. Do not rely on it for safety.

## Deployment
Use a dedicated host, rootless Docker where possible, keep Docker and OS patched, and do not expose the supervisor to untrusted users. Review agent-generated code before executing it outside the sandbox.
