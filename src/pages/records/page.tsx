import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Lock,
  Pencil,
  RadioTower,
  ScanLine,
  Search,
  Table2,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  classifyExpiry,
  daysUntilExpiry,
  fullName,
  getExpiryAlerts,
  type PassportRecordFields,
} from "@/lib/passport.ts";
import { exportPassportsToExcel } from "@/lib/excel.ts";
import EditRecordDialog from "./_components/edit-record-dialog.tsx";
import CheckInCounters from "./_components/checkin-counters.tsx";
import ExpiryAlerts from "./_components/expiry-alerts.tsx";
import RecordsFilters, {
  type ExpiryStatusFilter,
  type SortOption,
} from "./_components/records-filters.tsx";

type RecordRow = Doc<"passports"> & { imageUrl: string | null };

function toFields(record: RecordRow): PassportRecordFields {
  return {
    documentType: record.documentType,
    surname: record.surname,
    givenNames: record.givenNames,
    passportNumber: record.passportNumber,
    nationality: record.nationality,
    issuingCountry: record.issuingCountry,
    dateOfBirth: record.dateOfBirth,
    sex: record.sex,
    placeOfBirth: record.placeOfBirth,
    dateOfIssue: record.dateOfIssue,
    dateOfExpiry: record.dateOfExpiry,
    personalNumber: record.personalNumber,
    mrz: record.mrz,
    notes: record.notes,
  };
}

function ExpiryCell({ dateOfExpiry }: { dateOfExpiry: string }) {
  const days = daysUntilExpiry(dateOfExpiry);
  if (!dateOfExpiry) return <span className="text-muted-foreground">—</span>;
  if (days === null) return <span>{dateOfExpiry}</span>;
  if (days < 0) {
    return (
      <span className="flex items-center gap-2">
        {dateOfExpiry}
        <Badge variant="destructive">Expired</Badge>
      </span>
    );
  }
  if (days < 180) {
    return (
      <span className="flex items-center gap-2">
        {dateOfExpiry}
        <Badge variant="secondary">{days}d left</Badge>
      </span>
    );
  }
  return <span>{dateOfExpiry}</span>;
}

function RecordsTable() {
  const records = useQuery(api.passports.listAll, {});
  const removeRecord = useMutation(api.passports.remove);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<Id<"passports">>>(new Set());
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RecordRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpiryStatusFilter>("all");
  const [selectedNationalities, setSelectedNationalities] = useState<Set<string>>(
    new Set(),
  );
  const [sortBy, setSortBy] = useState<SortOption>("scanned_desc");

  const nationalities = useMemo(() => {
    if (!records) return [];
    const unique = new Set(
      records.map((record) => record.nationality.trim()).filter(Boolean),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const toggleNationality = (nationality: string) => {
    setSelectedNationalities((prev) => {
      const next = new Set(prev);
      if (next.has(nationality)) next.delete(nationality);
      else next.add(nationality);
      return next;
    });
  };

  const hasActiveFilters =
    statusFilter !== "all" || selectedNationalities.size > 0 || sortBy !== "scanned_desc";

  const clearFilters = () => {
    setStatusFilter("all");
    setSelectedNationalities(new Set());
    setSortBy("scanned_desc");
  };

  const filtered = useMemo(() => {
    if (!records) return [];
    const term = search.trim().toLowerCase();

    let result = records;
    if (term) {
      result = result.filter((record) =>
        [
          record.surname,
          record.givenNames,
          record.passportNumber,
          record.nationality,
          record.issuingCountry,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((record) => {
        const status = classifyExpiry(record.dateOfExpiry);
        if (statusFilter === "valid") return status === "valid" || status === null;
        return status === statusFilter;
      });
    }

    if (selectedNationalities.size > 0) {
      result = result.filter((record) =>
        selectedNationalities.has(record.nationality.trim()),
      );
    }

    const sorted = [...result];
    switch (sortBy) {
      case "scanned_asc":
        sorted.sort((a, b) => a._creationTime - b._creationTime);
        break;
      case "name_asc":
        sorted.sort((a, b) =>
          fullName(toFields(a)).localeCompare(fullName(toFields(b))),
        );
        break;
      case "expiry_asc":
        sorted.sort((a, b) => {
          const aDays = daysUntilExpiry(a.dateOfExpiry);
          const bDays = daysUntilExpiry(b.dateOfExpiry);
          if (aDays === null && bDays === null) return 0;
          if (aDays === null) return 1;
          if (bDays === null) return -1;
          return aDays - bDays;
        });
        break;
      case "scanned_desc":
      default:
        sorted.sort((a, b) => b._creationTime - a._creationTime);
        break;
    }

    return sorted;
  }, [records, search, statusFilter, selectedNationalities, sortBy]);

  const toggleRow = (id: Id<"passports">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((record) => selected.has(record._id));

  const toggleAll = () => {
    setSelected(
      allVisibleSelected ? new Set() : new Set(filtered.map((r) => r._id)),
    );
  };

  const handleExport = () => {
    const chosen =
      selected.size > 0
        ? filtered.filter((record) => selected.has(record._id))
        : filtered;
    if (chosen.length === 0) {
      toast.error("There are no records to export");
      return;
    }
    exportPassportsToExcel(
      chosen.map((record) => ({
        ...toFields(record),
        _creationTime: record._creationTime,
        confidence: record.confidence,
      })),
    );
    toast.success(
      `Exported ${chosen.length} record${chosen.length > 1 ? "s" : ""} to Excel`,
    );
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await removeRecord({ id: pendingDelete._id });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(pendingDelete._id);
        return next;
      });
      toast.success("Record deleted");
      setPendingDelete(null);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message: string }).message
          : "Could not delete this record";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const todayLabel = new Date().toDateString();
  const stats = useMemo(() => {
    if (!records) return { checkedInToday: 0, expiringSoon: 0, expired: 0 };
    let checkedInToday = 0;
    let expiringSoon = 0;
    let expired = 0;
    for (const record of records) {
      if (new Date(record._creationTime).toDateString() === todayLabel) {
        checkedInToday += 1;
      }
      const days = daysUntilExpiry(record.dateOfExpiry);
      if (days !== null) {
        if (days < 0) expired += 1;
        else if (days < 180) expiringSoon += 1;
      }
    }
    return { checkedInToday, expiringSoon, expired };
  }, [records, todayLabel]);

  const expiryAlerts = useMemo(
    () => (records ? getExpiryAlerts(records) : []),
    [records],
  );

  if (records === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <CheckInCounters
          total={0}
          checkedInToday={0}
          expiringSoon={0}
          expired={0}
        />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Table2 />
            </EmptyMedia>
            <EmptyTitle>No records yet</EmptyTitle>
            <EmptyDescription>
              Scan your first passport and it will appear here, ready to export.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" asChild>
              <Link to="/scan">
                <ScanLine className="size-4" />
                Scan a passport
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CheckInCounters
        total={records.length}
        checkedInToday={stats.checkedInToday}
        expiringSoon={stats.expiringSoon}
        expired={stats.expired}
      />

      <ExpiryAlerts
        alerts={expiryAlerts}
        onRenew={(alertRecord) => {
          const record = records.find((r) => r._id === alertRecord._id);
          if (record) setEditing(record);
        }}
      />

      <RecordsFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        nationalities={nationalities}
        selectedNationalities={selectedNationalities}
        onToggleNationality={toggleNationality}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, number, nationality"
            className="pl-9"
          />
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          {selected.size > 0 && (
            <span className="text-muted-foreground text-sm">
              {selected.size} selected
            </span>
          )}
          <Button onClick={handleExport}>
            <FileSpreadsheet className="size-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all records"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Passport no.</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Date of birth</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Scanned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((record) => (
                <TableRow key={record._id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(record._id)}
                      onCheckedChange={() => toggleRow(record._id)}
                      aria-label={`Select ${fullName(toFields(record))}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {fullName(toFields(record)) || "Unnamed"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.passportNumber || "—"}
                  </TableCell>
                  <TableCell>{record.nationality || "—"}</TableCell>
                  <TableCell>{record.dateOfBirth || "—"}</TableCell>
                  <TableCell>
                    <ExpiryCell dateOfExpiry={record.dateOfExpiry} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(record._creationTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit record"
                        onClick={() => setEditing(record)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete record"
                        onClick={() => setPendingDelete(record)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 && (
          <p className="text-muted-foreground p-8 text-center text-sm">
            {search
              ? `No records match "${search}".`
              : "No records match the selected filters."}
          </p>
        )}
      </Card>

      {editing && (
        <EditRecordDialog
          key={editing._id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          recordId={editing._id}
          initialFields={toFields(editing)}
          imageUrl={editing.imageUrl}
        />
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              The passport data and its scanned image will be permanently
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RecordsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Records</h1>
          <span className="border-border bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide uppercase">
            <RadioTower className="size-3.5" />
            Arrivals control
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Every passport you have scanned, ready to review or export as a
          spreadsheet.
        </p>
      </div>

      <AuthLoading>
        <Skeleton className="h-64 w-full" />
      </AuthLoading>
      <Unauthenticated>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full">
            <Lock className="size-5" />
          </span>
          <h2 className="font-serif text-2xl">Sign in to view records</h2>
          <p className="text-muted-foreground text-sm">
            Your passport records are private to your account.
          </p>
          <SignInButton signInText="Sign in to continue" />
        </div>
      </Unauthenticated>
      <Authenticated>
        <RecordsTable />
      </Authenticated>
    </div>
  );
}
