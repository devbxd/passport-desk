import { ArrowUpDown, ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";

export type ExpiryStatusFilter = "all" | "valid" | "expiring" | "expired";
export type SortOption =
  | "scanned_desc"
  | "scanned_asc"
  | "name_asc"
  | "expiry_asc";

const STATUS_OPTIONS: { value: ExpiryStatusFilter; label: string }[] = [
  { value: "all", label: "All expiry statuses" },
  { value: "valid", label: "Valid" },
  { value: "expiring", label: "Expiring within 6 months" },
  { value: "expired", label: "Expired" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "scanned_desc", label: "Recently scanned" },
  { value: "scanned_asc", label: "Oldest scanned" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "expiry_asc", label: "Expiry (soonest first)" },
];

type RecordsFiltersProps = {
  statusFilter: ExpiryStatusFilter;
  onStatusFilterChange: (value: ExpiryStatusFilter) => void;
  nationalities: string[];
  selectedNationalities: Set<string>;
  onToggleNationality: (nationality: string) => void;
  sortBy: SortOption;
  onSortByChange: (value: SortOption) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

export default function RecordsFilters({
  statusFilter,
  onStatusFilterChange,
  nationalities,
  selectedNationalities,
  onToggleNationality,
  sortBy,
  onSortByChange,
  onClearFilters,
  hasActiveFilters,
}: RecordsFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <ListFilter className="size-3.5" />
          Filter
        </span>
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as ExpiryStatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by expiry status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground ml-2 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <ArrowUpDown className="size-3.5" />
          Sort
        </span>
        <Select value={sortBy} onValueChange={(value) => onSortByChange(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Sort records">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {nationalities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Nationality
          </span>
          {nationalities.map((nationality) => {
            const active = selectedNationalities.has(nationality);
            return (
              <button
                key={nationality}
                type="button"
                onClick={() => onToggleNationality(nationality)}
                aria-pressed={active}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {nationality}
              </button>
            );
          })}
        </div>
      )}

      {selectedNationalities.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from(selectedNationalities).map((nationality) => (
            <Badge key={nationality} variant="secondary" className="gap-1">
              {nationality}
              <button
                type="button"
                onClick={() => onToggleNationality(nationality)}
                aria-label={`Remove ${nationality} filter`}
                className="cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
