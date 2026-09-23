import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const frontend = fileURLToPath(new URL("../frontend/", import.meta.url));
const backend = fileURLToPath(new URL("../backend/", import.meta.url));
const vite = fileURLToPath(new URL("../frontend/node_modules/vite/bin/vite.js", import.meta.url));
if (!existsSync(vite) || !existsSync(new URL("../backend/node_modules/express/package.json", import.meta.url))) {
  console.error("Сначала: npm.cmd --prefix backend ci и npm.cmd --prefix frontend ci");
  process.exit(1);
}
async function compile(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: frontend, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error("Сборка frontend завершилась с ошибкой.")));
  });
}
await compile([fileURLToPath(new URL("../frontend/node_modules/typescript/bin/tsc", import.meta.url)), "--noEmit", "-p", "tsconfig.app.json"]);
await compile(["local-vite.mjs", "build"]);
const children = [];
let closing = false;
const stop = (code = 0) => {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
};
for (const [cwd, args] of [
  [backend, ["--env-file-if-exists=.env", "src/server.js"]],
  [frontend, ["local-vite.mjs", "preview"]],
]) {
  const child = spawn(process.execPath, args, {
    cwd, stdio: "inherit", windowsHide: true,
    // Fixed loopback ports keep this isolated from the old backend on 3001.
    env: { ...process.env, PORT: "3002", HOST: "127.0.0.1" },
  });
  children.push(child);
  child.once("error", () => { console.error("Не удалось запустить компонент."); stop(1); });
  child.once("exit", code => { if (!closing) stop(code || 1); });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
console.log(`SteppeX local: http://127.0.0.1:5173\nWorkspace: ${root}\nCtrl+C stops both processes. No paid requests run automatically.`);
