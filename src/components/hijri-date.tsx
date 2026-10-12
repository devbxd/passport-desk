import { toHijri } from "@/lib/hijri.ts";
import { cn } from "@/lib/utils.ts";

/** The Umm al-Qura Hijri equivalent of a YYYY-MM-DD date, in Arabic. */
export function HijriDate({
  date,
  className,
}: {
  date: string;
  className?: string;
}) {
  const hijri = toHijri(date, "ar");
  if (!hijri) return null;
  return (
    <span
      dir="rtl"
      lang="ar"
      className={cn("text-muted-foreground block text-xs", className)}
    >
      {hijri}
    </span>
  );
}

/** Highlighted Hijri date (Arabic and English) shown in Hijri scan mode. */
export function HijriDateCard({ date }: { date: string }) {
  const arabic = toHijri(date, "ar");
  const english = toHijri(date, "en");
  return (
    <div className="border-primary/40 bg-primary/5 rounded-md border px-3 py-2">
      {arabic && english ? (
        <>
          <p dir="rtl" lang="ar" className="text-primary text-lg leading-snug">
            {arabic}
          </p>
          <p className="text-muted-foreground text-xs">{english}</p>
        </>
      ) : (
        <p className="text-muted-foreground text-xs">
          Hijri date appears once a valid date is entered.
        </p>
      )}
    </div>
  );
}
