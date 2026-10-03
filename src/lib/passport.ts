export type PassportFieldKey =
  | "documentType"
  | "surname"
  | "givenNames"
  | "passportNumber"
  | "nationality"
  | "issuingCountry"
  | "dateOfBirth"
  | "sex"
  | "placeOfBirth"
  | "dateOfIssue"
  | "dateOfExpiry"
  | "personalNumber"
  | "mrz"
  | "notes"
  | ArabicFieldKey;

export type ArabicFieldKey =
  | "surnameAr"
  | "givenNamesAr"
  | "fatherNameAr"
  | "motherNameAr"
  | "placeOfBirthAr"
  | "nationalityAr"
  | "professionAr"
  | "addressAr"
  | "issuingAuthorityAr"
  | "otherArabic";

export type PassportRecordFields = Record<PassportFieldKey, string>;

export const EMPTY_PASSPORT: PassportRecordFields = {
  documentType: "",
  surname: "",
  givenNames: "",
  passportNumber: "",
  nationality: "",
  issuingCountry: "",
  dateOfBirth: "",
  sex: "",
  placeOfBirth: "",
  dateOfIssue: "",
  dateOfExpiry: "",
  personalNumber: "",
  mrz: "",
  notes: "",
  surnameAr: "",
  givenNamesAr: "",
  fatherNameAr: "",
  motherNameAr: "",
  placeOfBirthAr: "",
  nationalityAr: "",
  professionAr: "",
  addressAr: "",
  issuingAuthorityAr: "",
  otherArabic: "",
};

/**
 * Copies just the passport fields out of a scan result or stored record.
 * Records saved before a field existed come back without it, so it defaults
 * to an empty string.
 */
export function pickPassportFields(
  source: Partial<Record<PassportFieldKey, string | undefined>>,
): PassportRecordFields {
  const fields = { ...EMPTY_PASSPORT };
  for (const key of Object.keys(EMPTY_PASSPORT) as PassportFieldKey[]) {
    fields[key] = source[key] ?? "";
  }
  return fields;
}

type FieldDefinition = {
  key: Exclude<PassportFieldKey, ArabicFieldKey>;
  label: string;
  type: "text" | "date" | "sex";
  excelHeader: string;
};

export const PASSPORT_FIELDS: FieldDefinition[] = [
  { key: "surname", label: "Surname", type: "text", excelHeader: "Surname" },
  {
    key: "givenNames",
    label: "Given names",
    type: "text",
    excelHeader: "Given Names",
  },
  {
    key: "passportNumber",
    label: "Passport number",
    type: "text",
    excelHeader: "Passport Number",
  },
  {
    key: "nationality",
    label: "Nationality",
    type: "text",
    excelHeader: "Nationality",
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    type: "date",
    excelHeader: "Date of Birth",
  },
  { key: "sex", label: "Sex", type: "sex", excelHeader: "Sex" },
  {
    key: "placeOfBirth",
    label: "Place of birth",
    type: "text",
    excelHeader: "Place of Birth",
  },
  {
    key: "issuingCountry",
    label: "Issuing country",
    type: "text",
    excelHeader: "Issuing Country",
  },
  {
    key: "dateOfIssue",
    label: "Date of issue",
    type: "date",
    excelHeader: "Date of Issue",
  },
  {
    key: "dateOfExpiry",
    label: "Date of expiry",
    type: "date",
    excelHeader: "Date of Expiry",
  },
  {
    key: "documentType",
    label: "Document type",
    type: "text",
    excelHeader: "Document Type",
  },
  {
    key: "personalNumber",
    label: "Personal number",
    type: "text",
    excelHeader: "Personal Number",
  },
];

/**
 * Text printed in Arabic on the document, kept exactly as written (never
 * transliterated) alongside the Latin fields above.
 */
export const ARABIC_FIELDS: {
  key: ArabicFieldKey;
  label: string;
  excelHeader: string;
  multiline?: boolean;
}[] = [
  { key: "surnameAr", label: "Surname (Arabic)", excelHeader: "Surname (Arabic)" },
  {
    key: "givenNamesAr",
    label: "Given names (Arabic)",
    excelHeader: "Given Names (Arabic)",
  },
  {
    key: "fatherNameAr",
    label: "Father's name (Arabic)",
    excelHeader: "Father's Name (Arabic)",
  },
  {
    key: "motherNameAr",
    label: "Mother's name (Arabic)",
    excelHeader: "Mother's Name (Arabic)",
  },
  {
    key: "placeOfBirthAr",
    label: "Place of birth (Arabic)",
    excelHeader: "Place of Birth (Arabic)",
  },
  {
    key: "nationalityAr",
    label: "Nationality (Arabic)",
    excelHeader: "Nationality (Arabic)",
  },
  {
    key: "professionAr",
    label: "Profession (Arabic)",
    excelHeader: "Profession (Arabic)",
  },
  { key: "addressAr", label: "Address (Arabic)", excelHeader: "Address (Arabic)" },
  {
    key: "issuingAuthorityAr",
    label: "Issuing authority (Arabic)",
    excelHeader: "Issuing Authority (Arabic)",
  },
  {
    key: "otherArabic",
    label: "Other Arabic text",
    excelHeader: "Other Arabic Text",
    multiline: true,
  },
];

export const REQUIRED_FIELDS: PassportFieldKey[] = [
  "surname",
  "givenNames",
  "passportNumber",
];

export type PassportValidationIssue = {
  key: PassportFieldKey;
  message: string;
  severity: "error" | "warning";
};

function localToday(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validatePassportFields(
  fields: PassportRecordFields,
  today = localToday(),
): PassportValidationIssue[] {
  const issues: PassportValidationIssue[] = [];
  const dateKeys = ["dateOfBirth", "dateOfIssue", "dateOfExpiry"] as const;

  for (const key of REQUIRED_FIELDS) {
    if (!fields[key].trim()) {
      issues.push({ key, message: "This field is required.", severity: "error" });
    }
  }

  for (const key of dateKeys) {
    const value = fields[key];
    if (value && !isValidCalendarDate(value)) {
      issues.push({
        key,
        message: "Enter a valid date.",
        severity: "error",
      });
    }
  }

  if (isValidCalendarDate(fields.dateOfBirth) && fields.dateOfBirth > today) {
    issues.push({
      key: "dateOfBirth",
      message: "Date of birth cannot be in the future.",
      severity: "error",
    });
  }

  if (isValidCalendarDate(fields.dateOfIssue) && fields.dateOfIssue > today) {
    issues.push({
      key: "dateOfIssue",
      message: "Date of issue cannot be in the future.",
      severity: "error",
    });
  }

  if (
    isValidCalendarDate(fields.dateOfBirth) &&
    isValidCalendarDate(fields.dateOfIssue) &&
    fields.dateOfIssue < fields.dateOfBirth
  ) {
    issues.push({
      key: "dateOfIssue",
      message: "Date of issue cannot be earlier than date of birth.",
      severity: "error",
    });
  }

  if (
    isValidCalendarDate(fields.dateOfIssue) &&
    isValidCalendarDate(fields.dateOfExpiry) &&
    fields.dateOfExpiry < fields.dateOfIssue
  ) {
    issues.push({
      key: "dateOfExpiry",
      message: "Expiry date cannot be earlier than the issue date.",
      severity: "error",
    });
  }

  if (isValidCalendarDate(fields.dateOfExpiry) && fields.dateOfExpiry < today) {
    issues.push({
      key: "dateOfExpiry",
      message: "This passport appears to have expired.",
      severity: "warning",
    });
  }

  return issues;
}

/**
 * Age in whole years on `today`, or null when the date of birth is missing,
 * invalid or in the future. Always derived, never stored, so it can't go stale.
 */
export function calculateAge(
  dateOfBirth: string,
  today = localToday(),
): number | null {
  if (!isValidCalendarDate(dateOfBirth) || !isValidCalendarDate(today)) return null;
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);
  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age >= 0 ? age : null;
}

export function fullName(record: PassportRecordFields): string {
  return [record.givenNames, record.surname].filter(Boolean).join(" ").trim();
}

export function normalizePassportNumber(passportNumber: string): string {
  return passportNumber.trim().replace(/\s+/g, "").toUpperCase();
}

/** Days until expiry, or null when the date is missing or unparseable. */
export function daysUntilExpiry(dateOfExpiry: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfExpiry)) return null;
  const expiry = Date.parse(`${dateOfExpiry}T00:00:00Z`);
  if (Number.isNaN(expiry)) return null;
  return Math.round((expiry - Date.now()) / 86400000);
}

/** Renewal window: flag passports expiring within the next 6 months. */
export const RENEWAL_WINDOW_DAYS = 180;

export type ExpiryStatus = "expired" | "expiring";

/** Classifies a passport's expiry into "expired", "expiring" (within the renewal window), or "valid". Returns null when no valid date is set. */
export function classifyExpiry(
  dateOfExpiry: string,
): "expired" | "expiring" | "valid" | null {
  const days = daysUntilExpiry(dateOfExpiry);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days < RENEWAL_WINDOW_DAYS) return "expiring";
  return "valid";
}

export type ExpiryAlert<T> = {
  record: T;
  days: number;
  status: ExpiryStatus;
};

/** Splits records into expired and soon-to-expire (within 6 months) alerts, sorted most urgent first. */
export function getExpiryAlerts<T extends { dateOfExpiry: string }>(
  records: T[],
): ExpiryAlert<T>[] {
  const alerts: ExpiryAlert<T>[] = [];
  for (const record of records) {
    const days = daysUntilExpiry(record.dateOfExpiry);
    if (days === null) continue;
    if (days < 0) alerts.push({ record, days, status: "expired" });
    else if (days < RENEWAL_WINDOW_DAYS) alerts.push({ record, days, status: "expiring" });
  }
  return alerts.sort((a, b) => a.days - b.days);
}
