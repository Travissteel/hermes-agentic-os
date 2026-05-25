/**
 * Daily journal entries stored in the Obsidian vault.
 *
 * One markdown file per day at ~/brain/journal/YYYY-MM-DD.md. Each file has
 * a top-level H1 header for the date, then H2 sub-sections per entry, with
 * the timestamp as the heading. Obsidian auto-indexes these.
 *
 * Format example (~/brain/journal/2026-05-25.md):
 *
 *   # Journal — 2026-05-25
 *
 *   ## 14:23
 *   First entry text.
 *
 *   ## 14:35 (voice)
 *   A voice-captured entry.
 */
import { readFile, writeFile, appendFile, readdir, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "./paths";

export type EntrySource = "text" | "voice";

export type JournalEntry = {
  /** Stable id for React keys — `${date}#${index}`. */
  id: string;
  time: string; // HH:MM
  source: EntrySource;
  body: string;
};

export type JournalDay = {
  date: string; // YYYY-MM-DD
  filePath: string;
  exists: boolean;
  entries: JournalEntry[];
};

export type JournalDateSummary = {
  date: string;
  filePath: string;
  sizeBytes: number;
  modifiedAt: string;
  entryCount: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function filePathFor(date: string): string {
  return path.join(PATHS.brain.journal, `${date}.md`);
}

async function ensureJournalDir(): Promise<void> {
  await mkdir(PATHS.brain.journal, { recursive: true });
}

/**
 * Parse an entire day's markdown file into structured entries.
 * Tolerates manual edits as long as ## headings are in HH:MM format.
 */
function parseDay(date: string, raw: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const lines = raw.split("\n");
  let i = 0;
  let entryIdx = 0;

  // Skip optional H1 / blank lines at top
  while (i < lines.length && !lines[i].startsWith("## ")) i++;

  while (i < lines.length) {
    const heading = lines[i];
    const m = /^##\s+(\d{1,2}:\d{2})(?:\s*\(([^)]+)\))?\s*$/.exec(heading);
    if (!m) {
      i++;
      continue;
    }
    const time = m[1];
    const tag = (m[2] ?? "text").toLowerCase();
    const source: EntrySource = tag === "voice" ? "voice" : "text";
    i++;
    const bodyLines: string[] = [];
    while (i < lines.length && !lines[i].startsWith("## ")) {
      bodyLines.push(lines[i]);
      i++;
    }
    const body = bodyLines.join("\n").trim();
    entries.push({
      id: `${date}#${entryIdx++}`,
      time,
      source,
      body,
    });
  }

  return entries;
}

export async function readDay(date: string = todayISO()): Promise<JournalDay> {
  if (!DATE_RE.test(date)) throw new Error("invalid date format");
  const filePath = filePathFor(date);
  try {
    const raw = await readFile(filePath, "utf8");
    return {
      date,
      filePath,
      exists: true,
      entries: parseDay(date, raw),
    };
  } catch {
    return { date, filePath, exists: false, entries: [] };
  }
}

export async function appendEntry(input: {
  body: string;
  source?: EntrySource;
  date?: string;
}): Promise<JournalEntry> {
  const body = input.body.trim();
  if (!body) throw new Error("body is required");
  const date = input.date ?? todayISO();
  if (!DATE_RE.test(date)) throw new Error("invalid date");
  const source: EntrySource = input.source === "voice" ? "voice" : "text";
  const time = nowHM();

  await ensureJournalDir();
  const filePath = filePathFor(date);

  // First write: create the file with the H1 header.
  let isNew = false;
  try {
    await stat(filePath);
  } catch {
    isNew = true;
  }

  const tagSuffix = source === "voice" ? " (voice)" : "";
  const section = `\n## ${time}${tagSuffix}\n${body}\n`;

  if (isNew) {
    await writeFile(filePath, `# Journal — ${date}\n${section}`);
  } else {
    await appendFile(filePath, section);
  }

  // Re-read to get the proper index id.
  const updated = await readDay(date);
  return updated.entries[updated.entries.length - 1];
}

export async function listDates(): Promise<JournalDateSummary[]> {
  try {
    await ensureJournalDir();
    const files = await readdir(PATHS.brain.journal);
    const items = await Promise.all(
      files
        .filter((f) => DATE_RE.test(f.replace(/\.md$/, "")) && f.endsWith(".md"))
        .map(async (f): Promise<JournalDateSummary> => {
          const date = f.replace(/\.md$/, "");
          const filePath = path.join(PATHS.brain.journal, f);
          const s = await stat(filePath);
          // Cheap entry-count: count occurrences of `\n## ` (or starting-of-file `## `).
          const raw = await readFile(filePath, "utf8");
          const entryCount = (raw.match(/^##\s+\d{1,2}:\d{2}/gm) ?? []).length;
          return {
            date,
            filePath,
            sizeBytes: s.size,
            modifiedAt: s.mtime.toISOString(),
            entryCount,
          };
        })
    );
    return items.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}
