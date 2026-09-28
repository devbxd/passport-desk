import { useState } from "react";
import { CircleAlert, ClockAlert, RefreshCcw, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { ExpiryAlert } from "@/lib/passport.ts";
import type { Doc } from "@/convex/_generated/dataModel";

type RecordRow = Doc<"passports">;

const VISIBLE_LIMIT = 4;

type ExpiryAlertsProps = {
  alerts: ExpiryAlert<RecordRow>[];
  onRenew: (record: RecordRow) => void;
};

export default function ExpiryAlerts({ alerts, onRenew }: ExpiryAlertsProps) {
  const [showAll, setShowAll] = useState(false);
  if (alerts.length === 0) return null;

  const expiredCount = alerts.filter((alert) => alert.status === "expired").length;
  const expiringCount = alerts.length - expiredCount;
  const visible = showAll ? alerts : alerts.slice(0, VISIBLE_LIMIT);

  return (
    <Card className="overflow-hidden border-destructive/40 p-0">
      <div className="bg-destructive/90 text-destructive-foreground flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
          <TriangleAlert className="size-3.5" />
          Renewal alerts
        </span>
        <span className="text-xs font-medium tracking-wide uppercase opacity-90">
          {expiredCount > 0 &&
            `${expiredCount} expired${expiringCount > 0 ? " · " : ""}`}
          {expiringCount > 0 && `${expiringCount} due within 6 months`}
        </span>
      </div>

      <div className="divide-y">
        {visible.map(({ record, days, status }) => (
          <div
            key={record._id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={
                  status === "expired"
                    ? "bg-destructive/15 text-destructive flex size-8 shrink-0 items-center justify-center rounded-full"
                    : "bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full"
                }
              >
                {status === "expired" ? (
                  <CircleAlert className="size-4" />
                ) : (
                  <ClockAlert className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {[record.givenNames, record.surname].filter(Boolean).join(" ").trim() ||
                    "Unnamed passport"}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {record.passportNumber || "No passport number"} · Expires{" "}
                  {record.dateOfExpiry}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status === "expired" ? "destructive" : "secondary"}>
                {status === "expired"
                  ? `Expired ${Math.abs(days)}d ago`
                  : `${days}d left`}
              </Badge>
              <Button size="sm" variant="secondary" onClick={() => onRenew(record)}>
                <RefreshCcw className="size-3.5" />
                Renew
              </Button>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > VISIBLE_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="text-muted-foreground hover:bg-muted/50 w-full cursor-pointer border-t px-4 py-2 text-center text-xs font-medium"
        >
          {showAll ? "Show less" : `Show ${alerts.length - VISIBLE_LIMIT} more`}
        </button>
      )}
    </Card>
  );
}
