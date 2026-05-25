import os from "node:os";
import path from "node:path";

const HOME = os.homedir();

export const PATHS = {
  hermes: {
    home: path.join(HOME, ".hermes"),
    config: path.join(HOME, ".hermes/config.yaml"),
    cronJobs: path.join(HOME, ".hermes/cron/jobs.json"),
    sessions: path.join(HOME, ".hermes/sessions"),
    memories: path.join(HOME, ".hermes/memories"),
    skills: path.join(HOME, ".hermes/skills"),
    logs: path.join(HOME, ".hermes/logs"),
    webuiUrl: "http://127.0.0.1:8787",
  },
  claude: {
    projects: path.join(HOME, ".claude/projects"),
    antigravity: path.join(HOME, ".claude/projects/-home-travissteel-antigravity"),
    memory: path.join(
      HOME,
      ".claude/projects/-home-travissteel-antigravity/memory"
    ),
  },
  shared: {
    dir: path.join(HOME, "antigravity/shared"),
    activityLog: path.join(HOME, "antigravity/shared/activity-log.md"),
    hermesState: path.join(HOME, "antigravity/shared/hermes-state.md"),
    goals: path.join(HOME, "antigravity/shared/goals.json"),
    notes: path.join(HOME, "antigravity/shared/notes.md"),
    subscriptions: path.join(HOME, "antigravity/shared/subscriptions.json"),
  },
  brain: {
    root: path.join(HOME, "brain"),
    journal: path.join(HOME, "brain/journal"),
  },
  scripts: {
    refreshHermesState: path.join(
      HOME,
      "antigravity/scripts/refresh-hermes-state.sh"
    ),
  },
} as const;

export const HOME_DIR = HOME;
