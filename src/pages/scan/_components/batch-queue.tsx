import {
  CircleAlert,
  PlaneTakeoff,
  Radar,
  TowerControl,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";
import { fullName, type PassportRecordFields } from "@/lib/passport.ts";

type PendingBatchScan = {
  id: string;
  fields: PassportRecordFields;
  stage: "scanning" | "review";
};

type BatchQueueProps = {
  pending: PendingBatchScan[];
  activeId: string | null;
  savedCount: number;
  recentSaved: string[];
  totalCount: number;
  batchLimit: number;
  batchStarted: boolean;
  canAddScan: boolean;
  isBusy: boolean;
  onAddScan: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onFinish: () => void;
};

export default function BatchQueue({
  pending,
  activeId,
  savedCount,
  recentSaved,
  totalCount,
  batchLimit,
  batchStarted,
  canAddScan,
  isBusy,
  onAddScan,
  onSelect,
  onRemove,
  onFinish,
}: BatchQueueProps) {
  const canFinish = batchStarted && pending.length === 0 && !isBusy;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="bg-primary text-primary-foreground flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <span className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
          <TowerControl className="size-3.5" />
          Boarding queue
        </span>
        <span className="flex flex-wrap items-center gap-3 text-xs font-medium tracking-wide uppercase opacity-90">
          <span className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="bg-primary-foreground absolute inline-flex size-full animate-ping rounded-full opacity-60" />
              <span className="bg-primary-foreground relative inline-flex size-2 rounded-full" />
            </span>
            Tower online
          </span>
          <span className="font-mono tabular-nums opacity-80">
            {totalCount.toString().padStart(2, "0")}/{batchLimit} slots
          </span>
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              {savedCount} cleared for departure · {pending.length} holding for review
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onAddScan} disabled={!canAddScan || isBusy}>
              <PlaneTakeoff className="size-4" />
              Add passport
            </Button>
            <Button
              onClick={onFinish}
              disabled={!canFinish}
              title={pending.length > 0 ? "Save or remove pending scans first" : undefined}
            >
              <TowerControl className="size-4" />
              Finish batch
            </Button>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((scan, index) => {
              const selected = scan.id === activeId;
              const name = fullName(scan.fields);
              const title = name || scan.fields.passportNumber || `Scan ${index + 1}`;

              return (
                <div
                  key={scan.id}
                  className={cn(
                    "flex min-w-0 items-center gap-1 rounded-lg border p-1",
                    selected ? "border-primary bg-accent/50" : "bg-background",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left"
                    onClick={() => onSelect(scan.id)}
                    disabled={isBusy}
                    aria-current={selected ? "true" : undefined}
                  >
                    <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 flex-col items-center justify-center rounded-full">
                      {scan.stage === "scanning" ? (
                        <Radar className="size-4 animate-spin [animation-duration:2.5s]" />
                      ) : (
                        <CircleAlert className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-muted-foreground block font-mono text-[10px] tracking-widest">
                        GATE {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="block truncate text-sm font-medium">{title}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {scan.fields.passportNumber || "Passport number needed"}
                      </span>
                    </span>
                    <Badge
                      variant={selected ? "default" : "secondary"}
                      className="font-mono tracking-wide uppercase"
                    >
                      {scan.stage === "scanning"
                        ? "Boarding"
                        : selected
                          ? "Reviewing"
                          : "Hold"}
                    </Badge>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${title} from batch`}
                    onClick={() => onRemove(scan.id)}
                    disabled={isBusy}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {pending.length === 0 && savedCount === 0 && batchStarted && (
          <p className="text-muted-foreground border-t pt-3 text-sm">
            No scans are holding in this batch. You can finish it or add a passport.
          </p>
        )}

        {pending.length === 0 && savedCount > 0 && (
          <div className="border-t pt-3">
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <PlaneTakeoff className="size-3.5" />
              Cleared for departure
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {recentSaved.map((name, index) => (
                <span key={`${name}-${index}`} className="text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {pending.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Review, save, or remove every scan before this batch is cleared for departure.
          </p>
        )}
      </div>
    </Card>
  );
}
