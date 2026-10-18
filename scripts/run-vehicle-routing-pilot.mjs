import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const example = fileURLToPath(new URL('../examples/vehicle-routing/', import.meta.url));
const cli = fileURLToPath(new URL('../lib/bin/memo-architect.js', import.meta.url));
// An independent project and port; never use the other checkout's running server.
const child = spawn(process.execPath, [cli, 'dev', '--port', process.env.MEMO_PILOT_PORT ?? '3107', '--no-open', '--keep-alive'], { cwd: example, stdio: 'inherit', env: { ...process.env, MEMO_PILOT_HMR_PORT: process.env.MEMO_PILOT_HMR_PORT ?? "23107" } });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
