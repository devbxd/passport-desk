import { useCallback } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import {
  BadgeCheck,
  Lock,
  Mail,
  PlaneLanding,
  Radar,
  Save,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
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
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  REQUIRED_FIELDS,
  validatePassportFields,
} from "@/lib/passport.ts";
import { getPlan } from "@/lib/plans.ts";
import { api } from "@/convex/_generated/api.js";
import BatchQueue from "./_components/batch-queue.tsx";
import ImageSource from "./_components/image-source.tsx";
import PassportForm from "./_components/passport-form.tsx";
import useBatchScanner from "./_hooks/use-batch-scanner.ts";

function ScanLimitCard() {
  return (
    <Card className="border-primary/40">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-full">
          <Sparkles className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Monthly scan limit reached</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            You've used all the scans included in your current plan this
            month. Upgrade to a paid plan for a higher monthly limit, or wait
            until next month when your free scans reset.
          </p>
        </div>
        <Button asChild>
          <a href="mailto:hello@passportdesk.app?subject=Upgrade%20my%20plan">
            <Mail className="size-4" />
            Contact us to upgrade
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function BatchScanWorkspace() {
  const scanner = useBatchScanner();
  const usage = useQuery(api.scanUsage.getUsage, {});
  const draft = scanner.activeDraft;
  const validationIssues = draft ? validatePassportFields(draft.fields) : [];
  const validationErrors = validationIssues.filter(
    (issue) => issue.severity === "error",
  );
  const validationWarnings = validationIssues.filter(
    (issue) => issue.severity === "warning",
  );
  const missingRequired = draft
    ? REQUIRED_FIELDS.filter((key) => !draft.fields[key].trim()).length
    : 0;

  const limitReached = usage?.limitReached ?? false;
  const canAddScan = scanner.canAddScan && !limitReached;
  const isBusy = scanner.isBusy || scanner.isFinishing || scanner.isBulkProcessing;

  const requestAnotherScan = useCallback(() => {
    if (limitReached) return;
    document.getElementById("passport-image-input")?.click();
  }, [limitReached]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Passport scan desk</h1>
          <span className="border-border bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide uppercase">
            <Radar className="size-3.5" />
            Batch review
          </span>
          {usage && (
            <Badge variant={limitReached ? "destructive" : "secondary"} className="ml-auto">
              {usage.used}/{usage.limit} scans this month · {getPlan(usage.plan).name} plan
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Scan several passports in one visit. Check each result, make corrections,
          then save it before moving to the next.
        </p>
      </div>

      {limitReached && <ScanLimitCard />}

      {!limitReached && (
        <>
          <BatchQueue
            pending={scanner.drafts}
            activeId={scanner.activeId}
            savedCount={scanner.savedNames.length}
            recentSaved={scanner.savedNames}
            totalCount={scanner.totalCount}
            batchLimit={scanner.batchLimit}
            batchStarted={scanner.batchStarted}
            canAddScan={canAddScan}
            isBusy={isBusy}
            onAddScan={requestAnotherScan}
            onSelect={scanner.selectDraft}
            onRemove={(id) => void scanner.removeDraft(id)}
            onFinish={() => void scanner.finishBatch()}
          />

          <div className={`grid gap-6 ${canAddScan ? "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
            {canAddScan && (
              <div className="space-y-4">
                <ImageSource
                  onSelect={(blob, preview) => void scanner.selectImage(blob, preview)}
                  onSelectMultiple={(files) => void scanner.selectImages(files)}
                  disabled={scanner.isBusy || scanner.isFinishing || scanner.isBulkProcessing}
                />
                {scanner.bulkProgress && (
                  <Card className="border-primary/40">
                    <CardContent className="flex items-center gap-3 py-4">
                      <Spinner />
                      <p className="text-sm">
                        Scanning photo {scanner.bulkProgress.completed} of{" "}
                        {scanner.bulkProgress.total}...
                      </p>
                    </CardContent>
                  </Card>
                )}
                <p className="text-muted-foreground text-xs">
                  The camera is blocked inside the editor preview. Open your published
                  app to take pictures.
                </p>
              </div>
            )}

            <div
              className={`grid gap-6 ${canAddScan ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]" : "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"}`}
            >
              <div className="space-y-4">
                {draft ? (
                  <Card className="overflow-hidden pt-0">
                    <img
                      src={draft.previewUrl}
                      alt="Passport selected for review"
                      className="max-h-[420px] w-full object-contain"
                    />
                    <CardContent className="space-y-3">
                      {draft.stage === "scanning" ? (
                        <div className="flex items-center gap-3 text-sm">
                          <Spinner />
                          Reading the document and machine readable zone...
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            <BadgeCheck className="size-3.5" />
                            {draft.confidence}% confidence
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            Verify details against the passport before saving.
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                      <PlaneLanding className="text-muted-foreground size-8 opacity-50" />
                      <div className="space-y-1">
                        <p className="font-medium">
                          {canAddScan ? "Ready for the next passport" : "Batch limit reached"}
                        </p>
                        <p className="text-muted-foreground max-w-xs text-sm">
                          {canAddScan
                            ? "Add a photo to start. Each scan will appear in the batch queue for review."
                            : `This batch holds up to ${scanner.batchLimit} scans. Finish the batch or remove a passport to continue.`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Radar className="text-muted-foreground size-4" />
                    {draft ? "Review passport details" : "Extracted data"}
                  </CardTitle>
                  <CardDescription>
                    {draft
                      ? "Correct anything the scan missed. Saving this passport will not affect other scans in your batch."
                      : "Choose a passport image to view and verify extracted fields."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!draft && (
                    <div className="text-muted-foreground flex flex-col items-center gap-3 py-14 text-center text-sm">
                      <Radar className="size-8 opacity-40" />
                      Fields will appear here when a scan is selected from the queue.
                    </div>
                  )}

                  {draft?.stage === "scanning" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-9 w-full" />
                        </div>
                      ))}
                    </div>
                  )}

                  {draft?.stage === "review" && (
                    <>
                      {(draft.confidence < 80 || draft.fields.notes) && (
                        <Alert>
                          <TriangleAlert className="size-4" />
                          <AlertDescription>
                            {draft.fields.notes ||
                              "Some fields may be unreliable. Please double-check them."}
                          </AlertDescription>
                        </Alert>
                      )}
                      {validationWarnings.length > 0 && (
                        <Alert>
                          <TriangleAlert className="size-4" />
                          <AlertDescription>
                            {validationWarnings.map((issue) => issue.message).join(" ")}
                            {" You can still save after confirming the document details."}
                          </AlertDescription>
                        </Alert>
                      )}
                      <PassportForm
                        value={draft.fields}
                        onChange={scanner.updateFields}
                        validationIssues={validationIssues}
                      />
                      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                        <Button
                          onClick={() => void scanner.saveActive()}
                          disabled={
                            scanner.isBusy ||
                            scanner.isFinishing ||
                            missingRequired > 0 ||
                            validationErrors.length > 0
                          }
                        >
                          {scanner.isBusy ? <Spinner /> : <Save className="size-4" />}
                          {scanner.isBusy ? "Saving..." : "Save passport"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => void scanner.removeDraft(draft.id)}
                          disabled={scanner.isBusy || scanner.isFinishing}
                        >
                          Remove scan
                        </Button>
                        {missingRequired > 0 && (
                          <span className="text-muted-foreground text-sm">
                            {missingRequired} required field
                            {missingRequired > 1 ? "s" : ""} still empty
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={scanner.isDuplicateDialogOpen}
        onOpenChange={(open) => !scanner.isBusy && scanner.setDuplicateDialogOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible duplicate passport</AlertDialogTitle>
            <AlertDialogDescription>
              {scanner.duplicateMatches.length > 0
                ? "This passport number matches a record already in your account. Check the existing record before saving another copy."
                : "The most recent records do not show a match, but your account has older records that could not be checked. Review before saving."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-md border bg-muted/50 p-3">
            {scanner.duplicateMatches.map((record) => (
              <p key={record.id} className="text-sm font-medium">
                {record.name || "Unnamed record"}
              </p>
            ))}
            {scanner.duplicateMatches.length > 0 && scanner.olderRecordsMayExist && (
              <p className="text-muted-foreground text-xs">
                Only the 500 most recent records were checked; older records may
                also match.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={scanner.isBusy}>
              Review details
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                event.preventDefault();
                const saved = await scanner.saveDuplicate();
                if (saved) scanner.setDuplicateDialogOpen(false);
              }}
              disabled={scanner.isBusy}
            >
              {scanner.isBusy ? "Saving..." : "Save anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ScanPage() {
  return (
    <>
      <AuthLoading>
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
          <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full">
            <Lock className="size-5" />
          </span>
          <h1 className="font-serif text-2xl">Sign in to scan</h1>
          <p className="text-muted-foreground text-sm">
            Passport data is private to your account, so scanning requires a
            signed-in session.
          </p>
          <SignInButton signInText="Sign in to continue" />
        </div>
      </Unauthenticated>
      <Authenticated>
        <BatchScanWorkspace />
      </Authenticated>
    </>
  );
}
