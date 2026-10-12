import * as XLSX from "xlsx";
import { toHijriArabic } from "./hijri.ts";
import {
  ARABIC_FIELDS,
  PASSPORT_FIELDS,
  calculateAge,
  type PassportRecordFields,
} from "./passport.ts";

export type ExportableRecord = PassportRecordFields & {
  _creationTime: number;
  confidence: number;
};

/**
 * "gregorian" exports dates as stored (YYYY-MM-DD). "hijri" writes every
 * passport date in the Umm al-Qura calendar, in Arabic.
 */
export type ExportCalendar = "gregorian" | "hijri";

const EXTRA_HEADERS = ["MRZ", "Notes", "Confidence %", "Scanned At"] as const;

function fieldHeader(
  field: (typeof PASSPORT_FIELDS)[number],
  calendar: ExportCalendar,
): string {
  return calendar === "hijri" && field.type === "date"
    ? `${field.excelHeader} (Hijri)`
    : field.excelHeader;
}

// "Age" sits right after Date of Birth. It's computed at export time so the
// spreadsheet always shows the pilgrim's current age.
function headers(calendar: ExportCalendar): string[] {
  return [
    ...PASSPORT_FIELDS.flatMap((field) =>
      field.key === "dateOfBirth"
        ? [fieldHeader(field, calendar), "Age"]
        : [fieldHeader(field, calendar)],
    ),
    ...ARABIC_FIELDS.map((field) => field.excelHeader),
    ...EXTRA_HEADERS,
  ];
}

function toRow(
  record: ExportableRecord,
  calendar: ExportCalendar,
): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const field of PASSPORT_FIELDS) {
    const value = record[field.key];
    // A date that can't be converted is kept as typed rather than dropped.
    row[fieldHeader(field, calendar)] =
      calendar === "hijri" && field.type === "date"
        ? (toHijriArabic(value) ?? value)
        : value;
  }
  for (const field of ARABIC_FIELDS) {
    row[field.excelHeader] = record[field.key];
  }
  row["Age"] = calculateAge(record.dateOfBirth) ?? "";
  row["MRZ"] = record.mrz;
  row["Notes"] = record.notes;
  row["Confidence %"] = record.confidence;
  // Local time so the spreadsheet matches what the operator saw on screen.
  row["Scanned At"] = new Date(record._creationTime).toLocaleString();
  return row;
}

const ARABIC_HEADERS = new Set(ARABIC_FIELDS.map((field) => field.excelHeader));

function columnWidth(header: string): number {
  if (header === "MRZ") return 46;
  if (header === "Age") return 8;
  if (ARABIC_HEADERS.has(header) || header.endsWith("(Hijri)")) {
    return Math.max(24, header.length + 2);
  }
  return Math.max(14, header.length + 2);
}

/** Builds the worksheet rows; exported for tests. */
export function buildPassportRows(
  records: ExportableRecord[],
  calendar: ExportCalendar = "gregorian",
): { headers: string[]; rows: Record<string, string | number>[] } {
  return {
    headers: headers(calendar),
    rows: records.map((record) => toRow(record, calendar)),
  };
}

/** Builds and downloads an .xlsx workbook of passport records. */
export function exportPassportsToExcel(
  records: ExportableRecord[],
  calendar: ExportCalendar = "gregorian",
): void {
  const { headers: sheetHeaders, rows } = buildPassportRows(records, calendar);
  const sheet = XLSX.utils.json_to_sheet(rows, { header: sheetHeaders });

  sheet["!cols"] = sheetHeaders.map((header) => ({ wch: columnWidth(header) }));
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: sheetHeaders.length - 1, r: Math.max(records.length, 1) },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Passports");
  const today = new Date().toISOString().slice(0, 10);
  const suffix = calendar === "hijri" ? "-hijri" : "";
  XLSX.writeFile(workbook, `passport-records${suffix}-${today}.xlsx`);
}
