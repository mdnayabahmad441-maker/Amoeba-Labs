export type ExecutionCellMetric = {
  execution_date: string;
  is_scheduled: boolean;
  is_completed: boolean;
  is_not_applicable: boolean;
  is_top_three?: boolean;
};

export function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function moveDateKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function mondayOf(key: string) {
  const date = new Date(`${key}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

export function checklistDatePermissions(executionDate: string, today: string) {
  return {
    canEdit: executionDate >= today,
    canComplete: executionDate === today,
    isReadOnlyPast: executionDate < today,
    isPlannedFuture: executionDate > today,
  };
}

const WEEKDAY_NAMES = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

export function parseWeeklyExecutionCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV has no task rows.");

  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const required = ["task name","category","priority","target value","unit",...WEEKDAY_NAMES,"repeat future weeks"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}`);
  const at = (values: string[], name: string) => values[headers.indexOf(name)]?.trim() || "";
  const truthy = (value: string) => ["yes","y","true","1","x","✓"].includes(value.toLowerCase());

  return rows.slice(1).filter((values) => at(values, "task name")).map((values, index) => {
    const weekdays = WEEKDAY_NAMES.map((day, i) => truthy(at(values, day)) ? i + 1 : null)
      .filter((day): day is number => day !== null);
    const target = at(values, "target value");
    if (target && Number.isNaN(Number(target))) throw new Error(`Row ${index + 2}: Target Value must be numeric.`);
    if (!weekdays.length) throw new Error(`Row ${index + 2}: Select at least one weekday with Yes, X, 1 or ✓.`);
    return {
      name: at(values, "task name"), category: at(values, "category"),
      priority: at(values, "priority"), target_value: target, unit: at(values, "unit"),
      weekdays, repeat_future: truthy(at(values, "repeat future weeks")),
    };
  });
}

export function executionMetrics(cells: ExecutionCellMetric[], date?: string) {
  const applicable = cells.filter((cell) =>
    (!date || cell.execution_date === date) && cell.is_scheduled && !cell.is_not_applicable,
  );
  const completed = applicable.filter((cell) => cell.is_completed).length;
  const topThree = cells.filter((cell) =>
    (!date || cell.execution_date === date) && cell.is_scheduled && cell.is_top_three,
  );
  return {
    scheduled: applicable.length,
    completed,
    percentage: applicable.length ? Math.round(completed / applicable.length * 100) : null,
    topThreeCompleted: topThree.filter((cell) => cell.is_completed).length,
    topThreeTotal: topThree.length,
  };
}
