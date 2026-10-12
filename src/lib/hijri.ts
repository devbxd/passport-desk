const HIJRI_FORMATS = {
  ar: new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }),
  en: new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }),
};

/**
 * Converts a YYYY-MM-DD Gregorian date to the Umm al-Qura Hijri calendar,
 * in Arabic ("١ رمضان ١٤٤٧ هـ") or English ("Ramadan 1, 1447 AH"). Returns
 * null when the date is missing or invalid.
 */
export function toHijri(isoDate: string, language: "ar" | "en"): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Noon UTC so no time zone can shift the day.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return HIJRI_FORMATS[language].format(date);
}

export function toHijriArabic(isoDate: string): string | null {
  return toHijri(isoDate, "ar");
}
