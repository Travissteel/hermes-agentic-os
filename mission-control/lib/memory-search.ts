/**
 * Unified memory search across:
 *   - Obsidian vault           ~/brain/**​/*.md
 *   - Hermes memories          ~/.hermes/memories/**​/*.{md,jsonl}
 *   - Claude Code auto-memory  ~/.claude/projects/-home-travissteel-antigravity/memory/**​/*.md
 *
 * Plain case-insensitive substring matching with line-level excerpts.
 * The corpus is small (~100 files, <2 MB total) so we scan everything on each
 * request — no index needed.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "./paths";

export type MemorySource = "brain" | "hermes" | "claude";

export type SearchHit = {
  source: MemorySource;
  filePath: string;
  relPath: string;
  fileTitle: string;
  modifiedAt: string;
  matchCount: number;
  matches: Array<{
    lineNumber: number;
    line: string;
  }>;
};

export type SearchResult = {
  query: string;
  totalHits: number;
  hits: SearchHit[];
  perSource: Record<MemorySource, number>;
  durationMs: number;
};

type Root = {
  source: MemorySource;
  base: string;
  extensions: string[];
};

const ROOTS: Root[] = [
  { source: "brain", base: PATHS.brain.root, extensions: [".md"] },
  { source: "hermes", base: path.join(PATHS.hermes.home, "memories"), extensions: [".md", ".jsonl"] },
  { source: "claude", base: PATHS.claude.memory, extensions: [".md"] },
];

async function walkFiles(dir: string, extensions: string[]): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      // Skip lockfiles, hidden dirs, and Obsidian's internal metadata.
      if (e.name.startsWith(".")) continue;
      if (e.name.endsWith(".lock")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const nested = await walkFiles(full, extensions);
        out.push(...nested);
      } else if (e.isFile()) {
        if (extensions.some((ext) => e.name.toLowerCase().endsWith(ext))) {
          out.push(full);
        }
      }
    }
  } catch {
    // missing root → ignore
  }
  return out;
}

function fileTitleFrom(filePath: string): string {
  const base = path.basename(filePath).replace(/\.(md|jsonl)$/i, "");
  return base.replace(/[-_]/g, " ");
}

const MAX_MATCHES_PER_FILE = 5;
const EXCERPT_MAX = 240;

export async function searchMemory(
  query: string,
  opts: {
    sources?: MemorySource[];
    maxHits?: number;
  } = {}
): Promise<SearchResult> {
  const start = Date.now();
  const q = query.trim();
  if (!q) {
    return {
      query: "",
      totalHits: 0,
      hits: [],
      perSource: { brain: 0, hermes: 0, claude: 0 },
      durationMs: 0,
    };
  }
  const needle = q.toLowerCase();
  const wantedSources = opts.sources ?? ["brain", "hermes", "claude"];
  const maxHits = opts.maxHits ?? 80;
  const perSource: Record<MemorySource, number> = { brain: 0, hermes: 0, claude: 0 };
  const hits: SearchHit[] = [];

  for (const root of ROOTS) {
    if (!wantedSources.includes(root.source)) continue;
    const files = await walkFiles(root.base, root.extensions);
    for (const file of files) {
      let raw: string;
      let mtime: Date;
      try {
        const [content, s] = await Promise.all([readFile(file, "utf8"), stat(file)]);
        raw = content;
        mtime = s.mtime;
      } catch {
        continue;
      }
      const lines = raw.split("\n");
      const fileMatches: SearchHit["matches"] = [];
      let totalInFile = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(needle)) {
          totalInFile++;
          if (fileMatches.length < MAX_MATCHES_PER_FILE) {
            // Trim very long lines around the needle
            const lineLower = line.toLowerCase();
            const idx = lineLower.indexOf(needle);
            const start = Math.max(0, idx - 60);
            const end = Math.min(line.length, idx + needle.length + 180);
            const trimmed =
              (start > 0 ? "…" : "") +
              line.slice(start, end).trim() +
              (end < line.length ? "…" : "");
            fileMatches.push({
              lineNumber: i + 1,
              line: trimmed.slice(0, EXCERPT_MAX),
            });
          }
        }
      }
      if (totalInFile > 0) {
        perSource[root.source]++;
        hits.push({
          source: root.source,
          filePath: file,
          relPath: path.relative(root.base, file),
          fileTitle: fileTitleFrom(file),
          modifiedAt: mtime.toISOString(),
          matchCount: totalInFile,
          matches: fileMatches,
        });
      }
    }
  }

  // Rank: more matches first, then more recent
  hits.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return b.modifiedAt.localeCompare(a.modifiedAt);
  });

  const sliced = hits.slice(0, maxHits);

  return {
    query: q,
    totalHits: hits.length,
    hits: sliced,
    perSource,
    durationMs: Date.now() - start,
  };
}

export type MemoryFileContent = {
  source: MemorySource;
  filePath: string;
  relPath: string;
  modifiedAt: string;
  sizeBytes: number;
  content: string;
};

/**
 * Read a file's full content. Validates that the resolved path lies under one
 * of the known memory roots to prevent path traversal via the API.
 */
export async function readMemoryFile(absPath: string): Promise<MemoryFileContent | null> {
  const resolved = path.resolve(absPath);
  let owningRoot: Root | null = null;
  for (const root of ROOTS) {
    const base = path.resolve(root.base);
    if (resolved === base || resolved.startsWith(base + path.sep)) {
      owningRoot = root;
      break;
    }
  }
  if (!owningRoot) return null;
  if (!owningRoot.extensions.some((ext) => resolved.toLowerCase().endsWith(ext))) {
    return null;
  }
  try {
    const [content, s] = await Promise.all([
      readFile(resolved, "utf8"),
      stat(resolved),
    ]);
    return {
      source: owningRoot.source,
      filePath: resolved,
      relPath: path.relative(owningRoot.base, resolved),
      modifiedAt: s.mtime.toISOString(),
      sizeBytes: s.size,
      content,
    };
  } catch {
    return null;
  }
}

export async function countCorpus(): Promise<Record<MemorySource, number>> {
  const counts: Record<MemorySource, number> = { brain: 0, hermes: 0, claude: 0 };
  for (const root of ROOTS) {
    const files = await walkFiles(root.base, root.extensions);
    counts[root.source] = files.length;
  }
  return counts;
}
