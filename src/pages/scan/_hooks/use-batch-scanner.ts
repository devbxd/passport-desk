import { useCallback, useMemo, useRef, useState } from "react";
import { ConvexError } from "convex/values";
import { useAction, useConvex, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EMPTY_PASSPORT,
  fullName,
  REQUIRED_FIELDS,
  validatePassportFields,
  type PassportRecordFields,
} from "@/lib/passport.ts";

export const BATCH_SCAN_LIMIT = 10;

export type BatchScanStage = "scanning" | "review";

export type BatchScanDraft = {
  id: string;
  previewUrl: string;
  storageId: Id<"_storage"> | null;
  confidence: number;
  fields: PassportRecordFields;
  stage: BatchScanStage;
};

export type DuplicateMatch = {
  id: Id<"passports">;
  name: string;
};

export type BulkScanProgress = {
  total: number;
  completed: number;
};

type SelectImageResult = "saved" | "failed" | "limitReached";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

function isScanLimitError(error: unknown): boolean {
  if (!(error instanceof ConvexError)) return false;
  const data: unknown = error.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "reason" in data &&
    (data as { reason?: unknown }).reason === "SCAN_LIMIT_REACHED"
  );
}

function readStorageId(payload: unknown): Id<"_storage"> | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("storageId" in payload) ||
    typeof payload.storageId !== "string"
  ) {
    return null;
  }
  // Convex's upload endpoint returns a branded storage ID as JSON text.
  return payload.storageId as Id<"_storage">;
}

function makeDraft(previewUrl: string): BatchScanDraft {
  return {
    id: crypto.randomUUID(),
    previewUrl,
    storageId: null,
    confidence: 0,
    fields: EMPTY_PASSPORT,
    stage: "scanning",
  };
}

export default function useBatchScanner() {
  const convex = useConvex();
  const startBatch = useMutation(api.passports.startBatch);
  const createUploadTicket = useMutation(api.passports.createUploadTicket);
  const trackUpload = useMutation(api.passports.trackUpload);
  const discardUpload = useMutation(api.passports.discardUpload);
  const closeBatch = useMutation(api.passports.closeBatch);
  const extract = useAction(api.passportScan.extract);
  const createRecord = useMutation(api.passports.create);

  const [batchId, setBatchId] = useState(() => crypto.randomUUID());
  const [batchStarted, setBatchStarted] = useState(false);
  const batchReadyRef = useRef(false);
  const operationRef = useRef(false);
  const bulkRef = useRef(false);
  const [drafts, setDrafts] = useState<BatchScanDraft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkScanProgress | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [olderRecordsMayExist, setOlderRecordsMayExist] = useState(false);

  const totalCount = drafts.length + savedNames.length;
  const canAddScan = totalCount < BATCH_SCAN_LIMIT;
  const activeDraft = useMemo(
    () => drafts.find((draft) => draft.id === activeId) ?? null,
    [activeId, drafts],
  );

  const ensureBatchReady = useCallback(async () => {
    if (batchReadyRef.current) return batchId;
    await startBatch({ batchId });
    batchReadyRef.current = true;
    setBatchStarted(true);
    return batchId;
  }, [batchId, startBatch]);

  const updateFields = useCallback(
    (fields: PassportRecordFields) => {
      if (!activeId) return;
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === activeId ? { ...draft, fields } : draft,
        ),
      );
    },
    [activeId],
  );

  const selectDraft = useCallback(
    (id: string) => {
      if (isBusy || isFinishing) return;
      setActiveId(id);
      setIsDuplicateDialogOpen(false);
    },
    [isBusy, isFinishing],
  );

  // Uploads and scans a single image. Used directly for one-off captures, and
  // called in sequence from selectImages() for bulk imports. Reports back
  // whether the scan limit was hit so a bulk run can stop early instead of
  // failing on every remaining file.
  const selectImage = useCallback(
    async (blob: Blob, previewUrl: string): Promise<SelectImageResult> => {
      if (operationRef.current || isBusy || isFinishing) {
        URL.revokeObjectURL(previewUrl);
        return "failed";
      }
      if (drafts.length + savedNames.length >= BATCH_SCAN_LIMIT) {
        URL.revokeObjectURL(previewUrl);
        toast.error(`A batch can contain up to ${BATCH_SCAN_LIMIT} passports`);
        return "failed";
      }

      operationRef.current = true;
      setIsBusy(true);
      const draft = makeDraft(previewUrl);
      setDrafts((current) => [...current, draft]);
      setActiveId(draft.id);

      let currentBatchId = batchId;
      let uploadToken: string | null = null;
      let uploadedStorageId: Id<"_storage"> | null = null;
      let cleanupFailed = false;

      try {
        currentBatchId = await ensureBatchReady();
        const uploadTicket = await createUploadTicket({ batchId: currentBatchId });
        uploadToken = uploadTicket.uploadToken;

        const response = await fetch(uploadTicket.url, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });
        if (!response.ok) throw new Error("Upload failed. Please try again.");

        const storageId = readStorageId(await response.json());
        if (!storageId) {
          throw new Error("Could not confirm the uploaded image. Please try again.");
        }
        uploadedStorageId = storageId;
        await trackUpload({ storageId, uploadToken });
        uploadToken = null;

        setDrafts((current) =>
          current.map((entry) =>
            entry.id === draft.id ? { ...entry, storageId } : entry,
          ),
        );

        const result = await extract({ storageId });
        setDrafts((current) =>
          current.map((entry) =>
            entry.id === draft.id
              ? {
                  ...entry,
                  confidence: result.confidence,
                  fields: {
                    documentType: result.documentType,
                    surname: result.surname,
                    givenNames: result.givenNames,
                    passportNumber: result.passportNumber,
                    nationality: result.nationality,
                    issuingCountry: result.issuingCountry,
                    dateOfBirth: result.dateOfBirth,
                    sex: result.sex,
                    placeOfBirth: result.placeOfBirth,
                    dateOfIssue: result.dateOfIssue,
                    dateOfExpiry: result.dateOfExpiry,
                    personalNumber: result.personalNumber,
                    mrz: result.mrz,
                    notes: result.notes,
                  },
                  stage: "review",
                }
              : entry,
          ),
        );
        return "saved";
      } catch (error) {
        if (uploadToken || uploadedStorageId) {
          try {
            await discardUpload({
              batchId: currentBatchId,
              ...(uploadToken ? { uploadToken } : {}),
              ...(uploadedStorageId ? { storageId: uploadedStorageId } : {}),
            });
          } catch {
            cleanupFailed = true;
          }
        }

        URL.revokeObjectURL(previewUrl);
        setDrafts((current) => current.filter((entry) => entry.id !== draft.id));
        setActiveId((current) => (current === draft.id ? null : current));
        const limitReached = isScanLimitError(error);
        const message = getErrorMessage(error, "Passport scan failed. Please try again.");
        if (!limitReached) {
          toast.error(
            cleanupFailed
              ? `${message} A temporary image could not be cleaned up yet.`
              : message,
          );
        }
        return limitReached ? "limitReached" : "failed";
      } finally {
        operationRef.current = false;
        setIsBusy(false);
      }
    },
    [
      batchId,
      createUploadTicket,
      discardUpload,
      drafts.length,
      ensureBatchReady,
      extract,
      isBusy,
      isFinishing,
      savedNames.length,
      trackUpload,
    ],
  );

  // Imports several photos at once (from a multi-file picker or drag-and-drop)
  // and scans them one after another, updating the batch queue as each
  // finishes. Stops early if the account's monthly scan limit is hit.
  const selectImages = useCallback(
    async (files: File[]) => {
      if (bulkRef.current || operationRef.current || isBusy || isFinishing) {
        return;
      }
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        toast.error("Choose image files (JPG, PNG or HEIC)");
        return;
      }

      const capacity = BATCH_SCAN_LIMIT - (drafts.length + savedNames.length);
      if (capacity <= 0) {
        toast.error(`A batch can contain up to ${BATCH_SCAN_LIMIT} passports`);
        return;
      }

      const toProcess = imageFiles.slice(0, capacity);
      if (imageFiles.length > toProcess.length) {
        toast.message(
          `Only ${toProcess.length} of ${imageFiles.length} photos were added. A batch can contain up to ${BATCH_SCAN_LIMIT} passports.`,
        );
      }

      bulkRef.current = true;
      setIsBulkProcessing(true);
      setBulkProgress({ total: toProcess.length, completed: 0 });

      let limitReached = false;
      for (let index = 0; index < toProcess.length; index++) {
        const file = toProcess[index];
        const result = await selectImage(file, URL.createObjectURL(file));
        setBulkProgress({ total: toProcess.length, completed: index + 1 });
        if (result === "limitReached") {
          limitReached = true;
          toast.error(
            "Reached your plan's scan limit. Remaining photos in this import were not processed.",
          );
          break;
        }
      }

      bulkRef.current = false;
      setIsBulkProcessing(false);
      setBulkProgress(null);
      if (!limitReached && toProcess.length > 1) {
        toast.success(`Finished scanning ${toProcess.length} photos`);
      }
    },
    [drafts.length, isBusy, isFinishing, savedNames.length, selectImage],
  );

  const removeDraft = useCallback(
    async (id: string) => {
      const draft = drafts.find((entry) => entry.id === id);
      if (!draft || operationRef.current || isBusy || isFinishing) return;

      operationRef.current = true;
      setIsBusy(true);
      try {
        if (draft.storageId) {
          await discardUpload({ batchId, storageId: draft.storageId });
        }
        URL.revokeObjectURL(draft.previewUrl);
        const remaining = drafts.filter((entry) => entry.id !== id);
        setDrafts(remaining);
        setActiveId((current) =>
          current === id ? (remaining[0]?.id ?? null) : current,
        );
        setIsDuplicateDialogOpen(false);
        toast.success("Scan removed from this batch");
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not remove this passport image"));
      } finally {
        operationRef.current = false;
        setIsBusy(false);
      }
    },
    [batchId, discardUpload, drafts, isBusy, isFinishing],
  );

  const commitDraft = useCallback(
    async (draft: BatchScanDraft, allowDuplicate: boolean) => {
      if (!draft.storageId) {
        toast.error("This scan has no uploaded image. Scan it again.");
        return false;
      }
      const issues = validatePassportFields(draft.fields);
      if (
        REQUIRED_FIELDS.some((key) => !draft.fields[key].trim()) ||
        issues.some((issue) => issue.severity === "error")
      ) {
        setActiveId(draft.id);
        toast.error("Fix the highlighted passport details before saving");
        return false;
      }

      if (!allowDuplicate) {
        const result = await convex.query(
          api.passports.findDuplicatePassportNumbers,
          { passportNumber: draft.fields.passportNumber },
        );
        if (result.matches.length > 0 || result.olderRecordsMayExist) {
          setDuplicateMatches(result.matches);
          setOlderRecordsMayExist(result.olderRecordsMayExist);
          setActiveId(draft.id);
          setIsDuplicateDialogOpen(true);
          return false;
        }
      }

      await createRecord({
        storageId: draft.storageId,
        confidence: draft.confidence,
        ...draft.fields,
      });
      setSavedNames((current) => [
        fullName(draft.fields) || "Unnamed passport",
        ...current,
      ]);
      URL.revokeObjectURL(draft.previewUrl);
      setDrafts((current) => current.filter((entry) => entry.id !== draft.id));
      setActiveId((current) =>
        current === draft.id
          ? (drafts.find((entry) => entry.id !== draft.id)?.id ?? null)
          : current,
      );
      setIsDuplicateDialogOpen(false);
      toast.success(`${fullName(draft.fields) || "Passport"} saved to your records`);
      return true;
    },
    [convex, createRecord, drafts],
  );

  const saveActive = useCallback(async () => {
    if (!activeDraft || operationRef.current || isBusy || isFinishing) return;
    operationRef.current = true;
    setIsBusy(true);
    try {
      await commitDraft(activeDraft, false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save this passport"));
    } finally {
      operationRef.current = false;
      setIsBusy(false);
    }
  }, [activeDraft, commitDraft, isBusy, isFinishing]);

  const saveDuplicate = useCallback(async (): Promise<boolean> => {
    if (!activeDraft || operationRef.current || isBusy || isFinishing) return false;
    operationRef.current = true;
    setIsBusy(true);
    try {
      return await commitDraft(activeDraft, true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save this passport"));
      return false;
    } finally {
      operationRef.current = false;
      setIsBusy(false);
    }
  }, [activeDraft, commitDraft, isBusy, isFinishing]);

  const finishBatch = useCallback(async () => {
    if (
      drafts.length > 0 ||
      !batchStarted ||
      operationRef.current ||
      isBusy ||
      isFinishing
    ) {
      return;
    }

    operationRef.current = true;
    setIsFinishing(true);
    try {
      const abandonedScans = await closeBatch({ batchId });
      if (abandonedScans > 0) {
        toast.message(
          `Removed ${abandonedScans} unfinished scan${abandonedScans === 1 ? "" : "s"}`,
        );
      }
      toast.success(
        savedNames.length > 0
          ? `Batch complete · ${savedNames.length} passport${savedNames.length === 1 ? "" : "s"} saved`
          : "Empty batch closed",
      );
      setDrafts([]);
      setActiveId(null);
      setSavedNames([]);
      setDuplicateMatches([]);
      setOlderRecordsMayExist(false);
      setIsDuplicateDialogOpen(false);
      batchReadyRef.current = false;
      setBatchStarted(false);
      setBatchId(crypto.randomUUID());
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not finish this batch"));
    } finally {
      operationRef.current = false;
      setIsFinishing(false);
    }
  }, [batchId, batchStarted, closeBatch, drafts.length, isBusy, isFinishing, savedNames.length]);

  return {
    activeDraft,
    activeId,
    batchLimit: BATCH_SCAN_LIMIT,
    batchStarted,
    bulkProgress,
    canAddScan: canAddScan && !isBulkProcessing,
    drafts,
    duplicateMatches,
    isBulkProcessing,
    isBusy,
    isDuplicateDialogOpen,
    isFinishing,
    olderRecordsMayExist,
    savedNames,
    totalCount,
    updateFields,
    selectDraft,
    selectImage,
    selectImages,
    removeDraft,
    saveActive,
    saveDuplicate,
    setDuplicateDialogOpen: setIsDuplicateDialogOpen,
    finishBatch,
  };
}
