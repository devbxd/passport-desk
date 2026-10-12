import { describe, expect, it } from "vitest";
import { buildPassportRows, type ExportableRecord } from "@/lib/excel.ts";
import { toHijriArabic } from "@/lib/hijri.ts";
import { EMPTY_PASSPORT } from "@/lib/passport.ts";

const record: ExportableRecord = {
  ...EMPTY_PASSPORT,
  surname: "FAKHREDDINE",
  dateOfBirth: "2008-03-04",
  dateOfIssue: "2026-10-01",
  dateOfExpiry: "2036-09-30",
  _creationTime: 0,
  confidence: 95,
};

describe("toHijriArabic", () => {
  it("writes the Umm al-Qura date in Arabic", () => {
    // 1 Ramadan 1447 began on 18 February 2026 (Umm al-Qura).
    expect(toHijriArabic("2026-02-18")).toBe("١ رمضان ١٤٤٧ هـ");
  });

  it("returns null for missing or impossible dates", () => {
    expect(toHijriArabic("")).toBeNull();
    expect(toHijriArabic("2026-02-30")).toBeNull();
  });
});

describe("buildPassportRows", () => {
  it("keeps Gregorian dates in the normal export", () => {
    const { headers, rows } = buildPassportRows([record]);
    expect(headers).toContain("Date of Issue");
    expect(rows[0]?.["Date of Issue"]).toBe("2026-10-01");
  });

  it("converts every passport date to Arabic Hijri in the Hijri export", () => {
    const { headers, rows } = buildPassportRows([record], "hijri");
    expect(headers).not.toContain("Date of Issue");
    expect(rows[0]?.["Date of Issue (Hijri)"]).toBe(
      toHijriArabic("2026-10-01"),
    );
    expect(rows[0]?.["Date of Expiry (Hijri)"]).toBe(
      toHijriArabic("2036-09-30"),
    );
    expect(rows[0]?.["Date of Birth (Hijri)"]).toBe(
      toHijriArabic("2008-03-04"),
    );
    expect(rows[0]?.["Age"]).toBeTypeOf("number");
    expect(rows[0]?.["Surname"]).toBe("FAKHREDDINE");
  });
});
