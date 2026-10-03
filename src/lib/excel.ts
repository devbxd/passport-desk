import * as XLSX from "xlsx";
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

const EXTRA_HEADERS = ["MRZ", "Notes", "Confidence %", "Scanned At"] as const;

// "Age" sits right after Date of Birth. It's computed at export time so the
// spreadsheet always shows the pilgrim's current age.
const HEADERS: string[] = [
  ...PASSPORT_FIELDS.flatMap((field) =>
    field.key === "dateOfBirth" ? [field.excelHeader, "Age"] : [field.excelHeader],
  ),
  ...ARABIC_FIELDS.map((field) => field.excelHeader),
  ...EXTRA_HEADERS,
];

const ARABIC_HEADERS = new Set(ARABIC_FIELDS.map((field) => field.excelHeader));

function toRow(record: ExportableRecord): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const field of [...PASSPORT_FIELDS, ...ARABIC_FIELDS]) {
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

/** Builds and downloads an .xlsx workbook of passport records. */
export function exportPassportsToExcel(
  records: ExportableRecord[],
  fileName = `passport-records-${new Date().toISOString().slice(0, 10)}.xlsx`,
): void {
  const sheet = XLSX.utils.json_to_sheet(records.map(toRow), { header: HEADERS });

  sheet["!cols"] = HEADERS.map((header) => ({
    wch:
      header === "MRZ"
        ? 46
        : header === "Age"
          ? 8
          : ARABIC_HEADERS.has(header)
            ? Math.max(24, header.length + 2)
            : Math.max(14, header.length + 2),
  }));
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: HEADERS.length - 1, r: Math.max(records.length, 1) },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Passports");
  XLSX.writeFile(workbook, fileName);
}
