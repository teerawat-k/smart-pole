// Kill process listening on backend dev port (Windows-friendly)
import { spawnSync } from "node:child_process";
import { env } from "../src/config/env";

const port = env.PORT;
const isWin = process.platform === "win32";

if (isWin) {
  const out = spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout ?? "";
  const pids = new Set<string>();
  for (const line of out.split("\n")) {
    if (line.includes(`:${port}`) && line.toUpperCase().includes("LISTENING")) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
  }
  for (const pid of pids) spawnSync("taskkill", ["/F", "/PID", pid]);
} else {
  spawnSync("sh", ["-c", `lsof -ti:${port} | xargs -r kill -9`]);
}
