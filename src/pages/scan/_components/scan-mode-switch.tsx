import { CalendarDays, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { ScanMode } from "../_hooks/use-scan-mode.ts";

type ScanModeSwitchProps = {
  value: ScanMode;
  onChange: (mode: ScanMode) => void;
};

export default function ScanModeSwitch({
  value,
  onChange,
}: ScanModeSwitchProps) {
  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="Scan mode"
        className="bg-card border-border grid grid-cols-2 gap-1 rounded-lg border p-1"
      >
        <Button
          role="radio"
          aria-checked={value === "standard"}
          variant={value === "standard" ? "default" : "ghost"}
          onClick={() => onChange("standard")}
        >
          <ScanLine className="size-4" />
          Standard scan
        </Button>
        <Button
          role="radio"
          aria-checked={value === "hijri"}
          variant={value === "hijri" ? "default" : "ghost"}
          onClick={() => onChange("hijri")}
        >
          <CalendarDays className="size-4" />
          Hijri scan
        </Button>
      </div>
      {value === "hijri" && (
        <p className="text-muted-foreground text-xs">
          Each passport date is shown in the Hijri calendar (Umm al-Qura), in
          Arabic and English.
        </p>
      )}
    </div>
  );
}
