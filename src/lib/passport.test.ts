import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_PASSPORT,
  calculateAge,
  getExpiryAlerts,
  validatePassportFields,
} from "@/lib/passport.ts";

describe("calculateAge", () => {
  it("counts whole years and only ticks over on the birthday", () => {
    expect(calculateAge("1970-10-17", "2026-10-16")).toBe(55);
    expect(calculateAge("1970-10-17", "2026-10-17")).toBe(56);
    expect(calculateAge("1970-10-17", "2026-12-31")).toBe(56);
  });

  it("handles a leap-day birthday in a non-leap year", () => {
    expect(calculateAge("2000-02-29", "2026-02-28")).toBe(25);
    expect(calculateAge("2000-02-29", "2026-03-01")).toBe(26);
  });

  it("returns 0 for a baby under one year", () => {
    expect(calculateAge("2026-06-01", "2026-09-27")).toBe(0);
  });

  it("returns null for missing, invalid or future birth dates", () => {
    expect(calculateAge("", "2026-09-27")).toBeNull();
    expect(calculateAge("2000-02-30", "2026-09-27")).toBeNull();
    expect(calculateAge("not-a-date", "2026-09-27")).toBeNull();
    expect(calculateAge("2030-01-01", "2026-09-27")).toBeNull();
  });
});

describe("validatePassportFields", () => {
  it("requires the identifying fields", () => {
    const issues = validatePassportFields(EMPTY_PASSPORT, "2026-09-27");

    expect(issues.filter((issue) => issue.severity === "error")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "surname", message: "This field is required." }),
        expect.objectContaining({ key: "givenNames", message: "This field is required." }),
        expect.objectContaining({ key: "passportNumber", message: "This field is required." }),
      ]),
    );
  });

  it("rejects impossible calendar dates", () => {
    const issues = validatePassportFields(
      {
        ...EMPTY_PASSPORT,
        surname: "DOE",
        givenNames: "JANE",
        passportNumber: "AB123",
        dateOfBirth: "2000-02-30",
      },
      "2026-09-27",
    );

    expect(issues).toContainEqual({
      key: "dateOfBirth",
      message: "Enter a valid date.",
      severity: "error",
    });
  });

  it("rejects an issue date before birth and expiry before issue", () => {
    const issues = validatePassportFields(
      {
        ...EMPTY_PASSPORT,
        surname: "DOE",
        givenNames: "JANE",
        passportNumber: "AB123",
        dateOfBirth: "2000-02-29",
        dateOfIssue: "1999-12-31",
        dateOfExpiry: "1999-12-30",
      },
      "1999-01-01",
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "dateOfIssue", message: "Date of issue cannot be earlier than date of birth.", severity: "error" }),
        expect.objectContaining({ key: "dateOfExpiry", message: "Expiry date cannot be earlier than the issue date.", severity: "error" }),
      ]),
    );
  });

  it("allows a genuine leap day and warns for expired passports", () => {
    const issues = validatePassportFields(
      {
        ...EMPTY_PASSPORT,
        surname: "DOE",
        givenNames: "JANE",
        passportNumber: "AB123",
        dateOfBirth: "2000-02-29",
        dateOfIssue: "2020-01-01",
        dateOfExpiry: "2025-12-31",
      },
      "2026-09-27",
    );

    expect(issues).toEqual([
      expect.objectContaining({
        key: "dateOfExpiry",
        message: "This passport appears to have expired.",
        severity: "warning",
      }),
    ]);
  });
});

describe("getExpiryAlerts", () => {
  const NOW = new Date("2026-09-27T00:00:00Z");

  const record = (id: string, dateOfExpiry: string) => ({ id, dateOfExpiry });

  it("flags passports already expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const alerts = getExpiryAlerts([record("a", "2026-01-01")]);
      expect(alerts).toEqual([
        expect.objectContaining({ status: "expired", record: record("a", "2026-01-01") }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flags passports expiring within 6 months but not further out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const soon = record("b", "2026-11-01"); // ~35 days out
      const farOut = record("c", "2028-01-01"); // well beyond 6 months
      const alerts = getExpiryAlerts([soon, farOut]);
      expect(alerts).toEqual([
        expect.objectContaining({ status: "expiring", record: soon }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores records with no valid expiry date", () => {
    const alerts = getExpiryAlerts([record("d", ""), record("e", "not-a-date")]);
    expect(alerts).toEqual([]);
  });

  it("sorts most urgent (most overdue or soonest) first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const longExpired = record("f", "2025-01-01");
      const recentlyExpired = record("g", "2026-09-01");
      const soon = record("h", "2026-10-01");
      const alerts = getExpiryAlerts([soon, longExpired, recentlyExpired]);
      expect(alerts.map((alert) => alert.record.id)).toEqual(["f", "g", "h"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
