import { useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Save, TriangleAlert } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import PassportForm from "@/pages/scan/_components/passport-form.tsx";
import {
  REQUIRED_FIELDS,
  validatePassportFields,
  type PassportRecordFields,
} from "@/lib/passport.ts";

type EditRecordDialogProps = {
  recordId: Id<"passports">;
  initialFields: PassportRecordFields;
  imageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function EditRecordDialog({
  recordId,
  initialFields,
  imageUrl,
  open,
  onOpenChange,
}: EditRecordDialogProps) {
  const convex = useConvex();
  const updateRecord = useMutation(api.passports.update);
  const [fields, setFields] = useState<PassportRecordFields>(initialFields);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<
    Array<{ id: Id<"passports">; name: string }>
  >([]);
  const [olderRecordsMayExist, setOlderRecordsMayExist] = useState(false);
  const validationIssues = validatePassportFields(fields);
  const validationErrors = validationIssues.filter(
    (issue) => issue.severity === "error",
  );
  const validationWarnings = validationIssues.filter(
    (issue) => issue.severity === "warning",
  );

  const handleSave = async () => {
    if (
      REQUIRED_FIELDS.some((key) => !fields[key].trim()) ||
      validationErrors.length > 0
    ) {
      toast.error("Fix the highlighted passport details before saving");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await convex.query(
        api.passports.findDuplicatePassportNumbers,
        { passportNumber: fields.passportNumber, excludeRecordId: recordId },
      );
      setDuplicateMatches(result.matches);
      setOlderRecordsMayExist(result.olderRecordsMayExist);
      if (result.matches.length > 0 || result.olderRecordsMayExist) {
        setIsDuplicateDialogOpen(true);
        return;
      }
      await updateRecord({ id: recordId, ...fields });
      toast.success("Record updated");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message: string }).message
          : "Could not check or update this record";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    setIsSaving(true);
    try {
      await updateRecord({ id: recordId, ...fields });
      setIsDuplicateDialogOpen(false);
      toast.success("Record updated");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message: string }).message
          : "Could not update this record";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit record</DialogTitle>
          <DialogDescription>
            Correct any field that does not match the document.
          </DialogDescription>
        </DialogHeader>

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Scanned passport"
            className="max-h-56 w-full rounded-md border object-contain"
          />
        )}

        {validationWarnings.length > 0 && (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertDescription>
              {validationWarnings.map((issue) => issue.message).join(" ")}
              {" Confirm the details before saving."}
            </AlertDescription>
          </Alert>
        )}

        <PassportForm
          value={fields}
          onChange={setFields}
          validationIssues={validationIssues}
        />

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save className="size-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog
        open={isDuplicateDialogOpen}
        onOpenChange={(nextOpen) => !isSaving && setIsDuplicateDialogOpen(nextOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible duplicate passport</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateMatches.length > 0
                ? "This passport number matches another record in your account. Review the match before saving."
                : "The most recent records do not show a match, but older records could not be checked. Review before saving."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-md border bg-muted/50 p-3">
            {duplicateMatches.map((record) => (
              <p key={record.id} className="text-sm font-medium">
                {record.name || "Unnamed record"}
              </p>
            ))}
            {duplicateMatches.length > 0 && olderRecordsMayExist && (
              <p className="text-muted-foreground text-xs">
                Only the 500 most recent records were checked; older records may also match.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Review details</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
