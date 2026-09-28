import * as XLSX from "xlsx";
import { PASSPORT_FIELDS, type PassportRecordFields } from "./passport.ts";

export type ExportableRecord = PassportRecordFields & {
  _creationTime: number;
  confidence: number;
};

const EXTRA_HEADERS = ["MRZ", "Notes", "Confidence %", "Scanned At"] as const;

function toRow(record: ExportableRecord): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const field of PASSPORT_FIELDS) {
    row[field.excelHeader] = record[field.key];
  }
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
  const headers = [
    ...PASSPORT_FIELDS.map((field) => field.excelHeader),
    ...EXTRA_HEADERS,
  ];
  const sheet = XLSX.utils.json_to_sheet(records.map(toRow), { header: headers });

  sheet["!cols"] = headers.map((header) => ({
    wch: header === "MRZ" ? 46 : Math.max(14, header.length + 2),
  }));
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: headers.length - 1, r: Math.max(records.length, 1) },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Passports");
  XLSX.writeFile(workbook, fileName);
}
