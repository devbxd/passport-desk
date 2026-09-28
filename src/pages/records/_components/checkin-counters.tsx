import { IdCard, PlaneLanding, Radar, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";

type Counter = {
  id: string;
  label: string;
  value: number;
  icon: typeof IdCard;
};

type CheckInCountersProps = {
  total: number;
  checkedInToday: number;
  expiringSoon: number;
  expired: number;
};

export default function CheckInCounters({
  total,
  checkedInToday,
  expiringSoon,
  expired,
}: CheckInCountersProps) {
  const counters: Counter[] = [
    { id: "01", label: "Travelers logged", value: total, icon: IdCard },
    { id: "02", label: "Checked in today", value: checkedInToday, icon: PlaneLanding },
    { id: "03", label: "Expiring soon", value: expiringSoon, icon: TriangleAlert },
    { id: "04", label: "Expired documents", value: expired, icon: Radar },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-primary text-primary-foreground flex items-center justify-between gap-2 px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
          <Radar className="size-3.5" />
          Check-in counters
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase opacity-80">
          <span className="relative flex size-2">
            <span className="bg-primary-foreground absolute inline-flex size-full animate-ping rounded-full opacity-60" />
            <span className="bg-primary-foreground relative inline-flex size-2 rounded-full" />
          </span>
          Tower online
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
        {counters.map((counter, index) => (
          <div
            key={counter.id}
            className={cn(
              "flex flex-col gap-2 px-4 py-4",
              index >= 2 && "border-t sm:border-t-0",
            )}
          >
            <div className="text-muted-foreground flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest">
                DESK {counter.id}
              </span>
              <counter.icon className="size-3.5" />
            </div>
            <span className="font-mono text-3xl leading-none tabular-nums">
              {String(counter.value).padStart(2, "0")}
            </span>
            <span className="text-muted-foreground text-xs">{counter.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
