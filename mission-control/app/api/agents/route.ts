import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getActivity } from "@/lib/activity";
import { getAntigravityInfo } from "@/lib/antigravity";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

export type AgentStatus = "working" | "idle" | "offline";

export type Agent = {
  id: "claude" | "hermes" | "antigravity";
  name: string;
  status: AgentStatus;
  detail: string;
  lastActivityAt: string | null;
  webUrl: string | null;
};

async function isUserServiceActive(unit: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `systemctl --user is-active ${unit}`
    );
    return stdout.trim() === "active";
  } catch {
    return false;
  }
}

export async function GET() {
  const [gatewayUp, webuiUp, activity, agy] = await Promise.all([
    isUserServiceActive("hermes-gateway.service"),
    isUserServiceActive("hermes-webui.service"),
    getActivity(50),
    getAntigravityInfo(),
  ]);

  const lastClaude = activity.find((a) => a.agent === "claude");

  // Working = activity within last 60s.
  const now = Date.now();
  const isWorking = (ts: string | null) => {
    if (!ts) return false;
    const t = new Date(ts.replace(" ", "T")).getTime();
    return Number.isFinite(t) && now - t < 60_000;
  };

  // Antigravity "working" if its CLI log was touched in the last 60s.
  const agyWorking = agy.lastCliActivityAt
    ? now - new Date(agy.lastCliActivityAt).getTime() < 60_000
    : false;

  const agents: Agent[] = [
    {
      id: "hermes",
      name: "Hermes",
      status: gatewayUp ? "idle" : "offline",
      detail: gatewayUp
        ? webuiUp
          ? "Gateway + WebUI active"
          : "Gateway active (WebUI down)"
        : "Gateway down",
      lastActivityAt: null,
      webUrl: webuiUp ? "http://127.0.0.1:8787" : null,
    },
    {
      id: "claude",
      name: "Claude Code",
      status: isWorking(lastClaude?.timestamp ?? null) ? "working" : "idle",
      detail: lastClaude
        ? `Last: ${lastClaude.tool} → ${lastClaude.target.split("/").slice(-1)[0]}`
        : "No activity yet",
      lastActivityAt: lastClaude?.timestamp ?? null,
      webUrl: null,
    },
    {
      id: "antigravity",
      name: "Antigravity",
      status: !agy.installed
        ? "offline"
        : agy.authStatus !== "signed-in"
          ? "offline"
          : agyWorking
            ? "working"
            : "idle",
      detail: !agy.installed
        ? "agy not installed"
        : agy.authStatus !== "signed-in"
          ? "not signed in"
          : `${agy.defaultModel} · agy v${agy.version ?? "?"}`,
      lastActivityAt: agy.lastCliActivityAt,
      webUrl: null,
    },
  ];

  return Response.json({ agents });
}
