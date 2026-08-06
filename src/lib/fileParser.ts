// File parser: converts uploaded files into ParsedTask objects
// Supports Excel (.xlsx/.xls), CSV, Markdown (.md), and plain text (.txt)

export interface ParsedTask {
  name: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  date?: string;          // YYYY-MM-DD
  projectType?: string;   // personal, work, creative, health, errand
  tags?: string[];
}

// ── Column name mappings for Excel/CSV ──

const NAME_COLUMNS = ["task", "name", "title", "item", "action"];
const PRIORITY_COLUMNS = ["priority", "importance", "urgency"];
const DATE_COLUMNS = ["date", "due", "due date", "deadline", "when"];
const DESC_COLUMNS = ["description", "notes", "details", "info"];
const TYPE_COLUMNS = ["project", "type", "category", "projecttype", "project_type"];
const TAG_COLUMNS = ["tags", "labels", "tag"];

function normalizeKey(key: string): string {
  return (key || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
}

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    const n = normalizeKey(h);
    if (candidates.includes(n)) return h;
  }
  return null;
}

function normalizePriority(raw: string): "low" | "medium" | "high" | undefined {
  const n = raw.toLowerCase().trim();
  if (n === "1" || n === "high" || n === "urgent" || n === "important") return "high";
  if (n === "2" || n === "medium" || n === "mid") return "medium";
  if (n === "3" || n === "low") return "low";
  return undefined;
}

function parseDate(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Try parsing as date
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  // Try MM/DD/YYYY or DD/MM/YYYY
  const parts = trimmed.split(/[/-]/);
  if (parts.length === 3) {
    const d2 = new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
    if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];
    const d3 = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
    if (!isNaN(d3.getTime())) return d3.toISOString().split("T")[0];
  }
  return undefined;
}

function normalizeProjectType(raw: string): string | undefined {
  const n = raw.toLowerCase().trim();
  if (/personal|home|self/.test(n)) return "personal";
  if (/work|office|business|professional/.test(n)) return "work";
  if (/creative|design|art|writing/.test(n)) return "creative";
  if (/health|wellness|fitness|exercise|medical/.test(n)) return "health";
  if (/errand|shopping|chore|grocer/.test(n)) return "errand";
  return undefined;
}

// ── Excel / CSV Parser ──

async function parseExcel(file: File): Promise<ParsedTask[]> {
  const data = await file.arrayBuffer();
  // Dynamic import so xlsx isn't bundled eagerly
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
  const tasks: ParsedTask[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) continue;

    // Auto-detect columns from first row
    const headers = Object.keys(rows[0]);
    const nameCol = findColumn(headers, NAME_COLUMNS);
    const priorityCol = findColumn(headers, PRIORITY_COLUMNS);
    const dateCol = findColumn(headers, DATE_COLUMNS);
    const descCol = findColumn(headers, DESC_COLUMNS);
    const typeCol = findColumn(headers, TYPE_COLUMNS);
    const tagCol = findColumn(headers, TAG_COLUMNS);

    for (const row of rows) {
      // If no name column found, try the first column as fallback
      let name = nameCol ? String(row[nameCol] || "").trim() : "";
      if (!name && nameCol === null) {
        // Use first column as name if no column explicitly matched
        const firstVal = String(Object.values(row)[0] || "").trim();
        if (firstVal) name = firstVal;
      }
      if (!name) continue; // skip empty rows

      const priorityRaw = priorityCol ? String(row[priorityCol] || "").trim() : "";
      const desc = descCol ? String(row[descCol] || "").trim() : "";
      const dateRaw = dateCol ? String(row[dateCol] || "").trim() : "";
      const typeRaw = typeCol ? String(row[typeCol] || "").trim() : "";
      const tagsRaw = tagCol ? String(row[tagCol] || "").trim() : "";

      tasks.push({
        name,
        description: desc || undefined,
        priority: normalizePriority(priorityRaw) || undefined,
        date: parseDate(dateRaw) || undefined,
        projectType: normalizeProjectType(typeRaw) || undefined,
        tags: tagsRaw ? tagsRaw.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : undefined,
      });
    }
  }

  return tasks;
}

// ── Markdown Parser ──

async function parseMarkdown(file: File): Promise<ParsedTask[]> {
  const text = await file.text();
  const lines = text.split("\n");
  const tasks: ParsedTask[] = [];
  let currentGroup = "";

  for (const line of lines) {
    // Track heading as grouper
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      currentGroup = headingMatch[1].trim();
      continue;
    }

    // Match unchecked checkboxes: - [ ] task name
    const taskMatch = line.match(/^[-*+]\s*\[\s*\]\s+(.+)/);
    if (taskMatch) {
      const taskName = taskMatch[1].trim();
      if (!taskName) continue;
      tasks.push({
        name: taskName,
        description: currentGroup ? `From section: ${currentGroup}` : undefined,
        tags: currentGroup ? [currentGroup.toLowerCase().replace(/\s+/g, "-")] : undefined,
      });
    }
  }

  // If no checkboxes found, treat each non-heading non-empty line as a task
  if (tasks.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```")) continue;
      tasks.push({ name: trimmed });
    }
  }

  return tasks;
}

// ── Text Parser ──

async function parseText(file: File): Promise<ParsedTask[]> {
  const text = await file.text();
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((name) => ({ name }));
}

// ── File Parser Dispatcher ──

const SUPPORTED_EXTENSIONS: Record<string, string> = {
  xlsx: "Excel Spreadsheet",
  xls: "Excel Spreadsheet",
  csv: "CSV File",
  md: "Markdown File",
  txt: "Text File",
};

export function getSupportedFormats(): { ext: string; label: string }[] {
  return Object.entries(SUPPORTED_EXTENSIONS).map(([ext, label]) => ({ ext, label }));
}

export function isSupportedFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ext in SUPPORTED_EXTENSIONS;
}

export async function parseFile(file: File): Promise<ParsedTask[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "xlsx":
    case "xls":
    case "csv":
      return parseExcel(file);
    case "md":
      return parseMarkdown(file);
    case "txt":
      return parseText(file);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
