import { access, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const routePath = resolve(projectRoot, "src/app/api/state/route.ts");
const localOnlyPath = `${routePath}.local-only`;
const nextBinary = join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");

await access(routePath);
await rename(routePath, localOnlyPath);

let exitCode = 1;
try {
  const result = spawnSync(nextBinary, ["build"], {
    cwd: projectRoot,
    env: { ...process.env, NEXT_PUBLIC_STATIC_MODE: "true" },
    stdio: "inherit"
  });
  exitCode = result.status ?? 1;
} finally {
  await rename(localOnlyPath, routePath);
}

process.exitCode = exitCode;
