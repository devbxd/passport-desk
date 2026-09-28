import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalQuery,
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Please sign in to continue",
    });
  }
  return identity;
}

type PassportRecordDetails = {
  surname: string;
  givenNames: string;
  passportNumber: string;
  dateOfBirth: string;
  dateOfIssue: string;
  dateOfExpiry: string;
};

const REQUIRED_PASSPORT_FIELDS = [
  ["surname", "Surname"],
  ["givenNames", "Given names"],
  ["passportNumber", "Passport number"],
] as const;

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function latestAllowedPassportDate(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function validatePassportRecord(fields: PassportRecordDetails): void {
  const latestAllowedDate = latestAllowedPassportDate();

  for (const [key, label] of REQUIRED_PASSPORT_FIELDS) {
    if (!fields[key].trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `${label} is required.`,
      });
    }
  }

  const dates = [
    ["dateOfBirth", fields.dateOfBirth, "Date of birth"],
    ["dateOfIssue", fields.dateOfIssue, "Date of issue"],
    ["dateOfExpiry", fields.dateOfExpiry, "Date of expiry"],
  ] as const;

  for (const [, value, label] of dates) {
    if (value && !isValidCalendarDate(value)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `${label} must be a valid date.`,
      });
    }
  }

  if (
    isValidCalendarDate(fields.dateOfBirth) &&
    isValidCalendarDate(fields.dateOfIssue) &&
    fields.dateOfIssue < fields.dateOfBirth
  ) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Date of issue cannot be earlier than date of birth.",
    });
  }

  if (
    isValidCalendarDate(fields.dateOfBirth) &&
    fields.dateOfBirth > latestAllowedDate
  ) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Date of birth cannot be in the future.",
    });
  }

  if (
    isValidCalendarDate(fields.dateOfIssue) &&
    fields.dateOfIssue > latestAllowedDate
  ) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Date of issue cannot be in the future.",
    });
  }

  if (
    isValidCalendarDate(fields.dateOfIssue) &&
    isValidCalendarDate(fields.dateOfExpiry) &&
    fields.dateOfExpiry < fields.dateOfIssue
  ) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Expiry date cannot be earlier than the issue date.",
    });
  }
}

export const passportFields = {
  surname: v.string(),
  givenNames: v.string(),
  passportNumber: v.string(),
  nationality: v.string(),
  issuingCountry: v.string(),
  dateOfBirth: v.string(),
  sex: v.string(),
  placeOfBirth: v.string(),
  dateOfIssue: v.string(),
  dateOfExpiry: v.string(),
  documentType: v.string(),
  personalNumber: v.string(),
  mrz: v.string(),
  notes: v.string(),
};

const UPLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BATCH_SCANS = 10;
const MAX_UPLOADS_PER_CLEANUP = 10;

function uploadExpiry(): string {
  return new Date(Date.now() + UPLOAD_RETENTION_MS).toISOString();
}

async function cleanExpiredBatchData(
  ctx: MutationCtx,
  ownerTokenIdentifier: string,
  now: string,
): Promise<number> {
  const expiredBatches = await ctx.db
    .query("passportBatches")
    .withIndex("by_owner_and_expiry", (q) =>
      q.eq("ownerTokenIdentifier", ownerTokenIdentifier).lt("expiresAt", now),
    )
    .take(MAX_UPLOADS_PER_CLEANUP);

  let deletedUploads = 0;
  for (const batch of expiredBatches) {
    const [uploads, tickets] = await Promise.all([
      ctx.db
        .query("passportUploads")
        .withIndex("by_owner_and_batch", (q) =>
          q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("batchId", batch.batchId),
        )
        .take(MAX_BATCH_SCANS),
      ctx.db
        .query("passportUploadTickets")
        .withIndex("by_owner_and_batch", (q) =>
          q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("batchId", batch.batchId),
        )
        .take(MAX_BATCH_SCANS),
    ]);

    for (const upload of uploads) {
      await ctx.storage.delete(upload.storageId);
      await ctx.db.delete("passportUploads", upload._id);
      deletedUploads += 1;
    }
    for (const ticket of tickets) {
      await ctx.db.delete("passportUploadTickets", ticket._id);
    }
    await ctx.db.delete("passportBatches", batch._id);
  }

  const [orphanedUploads, orphanedTickets] = await Promise.all([
    ctx.db
      .query("passportUploads")
      .withIndex("by_owner_and_expiry", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).lt("expiresAt", now),
      )
      .take(MAX_UPLOADS_PER_CLEANUP),
    ctx.db
      .query("passportUploadTickets")
      .withIndex("by_owner_and_expiry", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).lt("expiresAt", now),
      )
      .take(MAX_UPLOADS_PER_CLEANUP),
  ]);

  const removedScansByBatch = new Map<string, number>();
  for (const upload of orphanedUploads) {
    await ctx.storage.delete(upload.storageId);
    await ctx.db.delete("passportUploads", upload._id);
    removedScansByBatch.set(
      upload.batchId,
      (removedScansByBatch.get(upload.batchId) ?? 0) + 1,
    );
    deletedUploads += 1;
  }
  for (const batchId of removedScansByBatch.keys()) {
    const batch = await ctx.db
      .query("passportBatches")
      .withIndex("by_owner_and_batch", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("batchId", batchId),
      )
      .unique();
    const removedCount = removedScansByBatch.get(batchId) ?? 0;
    if (batch && removedCount > 0) {
      await ctx.db.patch("passportBatches", batch._id, {
        scanCount: Math.max(0, batch.scanCount - removedCount),
      });
    }
  }
  for (const ticket of orphanedTickets) {
    await ctx.db.delete("passportUploadTickets", ticket._id);
  }

  return deletedUploads;
}

export const startBatch = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }) => {
    const identity = await requireIdentity(ctx);
    if (!batchId.trim() || batchId.length > 80) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This scan batch could not be identified. Start a new batch and try again.",
      });
    }

    await cleanExpiredBatchData(ctx, identity.tokenIdentifier, new Date().toISOString());
    const existingBatch = await ctx.db
      .query("passportBatches")
      .withIndex("by_owner_and_batch", (q) =>
        q
          .eq("ownerTokenIdentifier", identity.tokenIdentifier)
          .eq("batchId", batchId),
      )
      .unique();
    if (existingBatch) return;

    const expiresAt = uploadExpiry();
    await ctx.db.insert("passportBatches", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      batchId,
      scanCount: 0,
      expiresAt,
    });
  },
});

export const createUploadTicket = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }): Promise<{ url: string; uploadToken: string }> => {
    const identity = await requireIdentity(ctx);
    const batch = await ctx.db
      .query("passportBatches")
      .withIndex("by_owner_and_batch", (q) =>
        q
          .eq("ownerTokenIdentifier", identity.tokenIdentifier)
          .eq("batchId", batchId),
      )
      .unique();
    const now = new Date().toISOString();
    if (!batch || batch.expiresAt < now) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This scan batch has ended. Start a new batch to continue.",
      });
    }

    const existingTickets = await ctx.db
      .query("passportUploadTickets")
      .withIndex("by_owner_and_batch", (q) =>
        q
          .eq("ownerTokenIdentifier", identity.tokenIdentifier)
          .eq("batchId", batchId),
      )
      .take(MAX_BATCH_SCANS);
    const activeTickets = existingTickets.filter((ticket) => ticket.expiresAt >= now);
    for (const ticket of existingTickets) {
      if (ticket.expiresAt < now) {
        await ctx.db.delete("passportUploadTickets", ticket._id);
      }
    }

    if (batch.scanCount + activeTickets.length >= MAX_BATCH_SCANS) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `A batch can contain up to ${MAX_BATCH_SCANS} passport scans.`,
      });
    }

    const uploadToken = crypto.randomUUID();
    const expiresAt = uploadExpiry();
    await ctx.db.patch("passportBatches", batch._id, { expiresAt });
    const url = await ctx.storage.generateUploadUrl();
    await ctx.db.insert("passportUploadTickets", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      batchId,
      uploadToken,
      expiresAt,
    });
    return { url, uploadToken };
  },
});

export const trackUpload = mutation({
  args: { storageId: v.id("_storage"), uploadToken: v.string() },
  handler: async (ctx, { storageId, uploadToken }) => {
    const identity = await requireIdentity(ctx);
    const now = new Date().toISOString();
    const ticket = await ctx.db
      .query("passportUploadTickets")
      .withIndex("by_owner_and_token", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("uploadToken", uploadToken),
      )
      .unique();
    if (!ticket || ticket.expiresAt < now) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This upload was not started by your account.",
      });
    }

    const batch = await ctx.db
      .query("passportBatches")
      .withIndex("by_owner_and_batch", (q) =>
        q
          .eq("ownerTokenIdentifier", identity.tokenIdentifier)
          .eq("batchId", ticket.batchId),
      )
      .unique();
    if (!batch || batch.expiresAt < now || batch.scanCount >= MAX_BATCH_SCANS) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This scan batch has ended. Start a new batch to continue.",
      });
    }

    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Uploaded passport image was not found.",
      });
    }

    const [savedPassport, existingUpload] = await Promise.all([
      ctx.db
        .query("passports")
        .withIndex("by_storage", (q) => q.eq("storageId", storageId))
        .first(),
      ctx.db
        .query("passportUploads")
        .withIndex("by_storage", (q) => q.eq("storageId", storageId))
        .first(),
    ]);
    if (savedPassport || existingUpload) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "This image has already been added to a saved record or scan batch.",
      });
    }

    const expiresAt = uploadExpiry();
    await ctx.db.insert("passportUploads", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      batchId: ticket.batchId,
      storageId,
      expiresAt,
    });
    await ctx.db.patch("passportBatches", batch._id, {
      scanCount: batch.scanCount + 1,
      expiresAt,
    });
    await ctx.db.delete("passportUploadTickets", ticket._id);
  },
});

export const discardUpload = mutation({
  args: {
    batchId: v.string(),
    storageId: v.optional(v.id("_storage")),
    uploadToken: v.optional(v.string()),
  },
  handler: async (ctx, { batchId, storageId, uploadToken }) => {
    const identity = await requireIdentity(ctx);
    if (!storageId && !uploadToken) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Choose an uploaded scan or upload ticket to remove.",
      });
    }

    const batch = await ctx.db
      .query("passportBatches")
      .withIndex("by_owner_and_batch", (q) =>
        q
          .eq("ownerTokenIdentifier", identity.tokenIdentifier)
          .eq("batchId", batchId),
      )
      .unique();
    if (!batch) return false;

    let discarded = false;
    if (uploadToken) {
      const ticket = await ctx.db
        .query("passportUploadTickets")
        .withIndex("by_owner_and_token", (q) =>
          q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("uploadToken", uploadToken),
        )
        .unique();
      if (ticket && ticket.batchId === batchId) {
        await ctx.db.delete("passportUploadTickets", ticket._id);
        discarded = true;
      }
    }

    if (storageId) {
      const upload = await ctx.db
        .query("passportUploads")
        .withIndex("by_owner_and_storage", (q) =>
          q
            .eq("ownerTokenIdentifier", identity.tokenIdentifier)
            .eq("storageId", storageId),
        )
        .unique();
      if (upload && upload.batchId === batchId) {
        await ctx.storage.delete(storageId);
        await ctx.db.delete("passportUploads", upload._id);
        await ctx.db.patch("passportBatches", batch._id, {
          scanCount: Math.max(0, batch.scanCount - 1),
        });
        discarded = true;
      }
    }

    return discarded;
  },
});

export const cleanupExpiredUploads = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    return await cleanExpiredBatchData(
      ctx,
      identity.tokenIdentifier,
      new Date().toISOString(),
    );
  },
});

export const closeBatch = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }): Promise<number> => {
    const identity = await requireIdentity(ctx);
    const batch = await ctx.db
      .query("passportBatches")
      .withIndex("by_owner_and_batch", (q) =>
        q
          .eq("ownerTokenIdentifier", identity.tokenIdentifier)
          .eq("batchId", batchId),
      )
      .unique();
    if (!batch) return 0;

    const [uploads, tickets] = await Promise.all([
      ctx.db
        .query("passportUploads")
        .withIndex("by_owner_and_batch", (q) =>
          q
            .eq("ownerTokenIdentifier", identity.tokenIdentifier)
            .eq("batchId", batchId),
        )
        .take(MAX_BATCH_SCANS),
      ctx.db
        .query("passportUploadTickets")
        .withIndex("by_owner_and_batch", (q) =>
          q
            .eq("ownerTokenIdentifier", identity.tokenIdentifier)
            .eq("batchId", batchId),
        )
        .take(MAX_BATCH_SCANS),
    ]);

    for (const upload of uploads) {
      await ctx.storage.delete(upload.storageId);
      await ctx.db.delete("passportUploads", upload._id);
    }
    for (const ticket of tickets) {
      await ctx.db.delete("passportUploadTickets", ticket._id);
    }
    await ctx.db.delete("passportBatches", batch._id);
    return uploads.length;
  },
});

export const getImageUrl = internalQuery({
  args: {
    storageId: v.id("_storage"),
    ownerTokenIdentifier: v.string(),
  },
  handler: async (ctx, { storageId, ownerTokenIdentifier }) => {
    const upload = await ctx.db
      .query("passportUploads")
      .withIndex("by_owner_and_storage", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("storageId", storageId),
      )
      .unique();
    if (!upload) return null;
    return await ctx.storage.getUrl(storageId);
  },
});

function normalizePassportNumber(passportNumber: string): string {
  return passportNumber.trim().replace(/\s+/g, "").toUpperCase();
}

export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    confidence: v.number(),
    ...passportFields,
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    validatePassportRecord(args);
    if (args.confidence < 0 || args.confidence > 100) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Confidence must be between 0 and 100.",
      });
    }

    const upload = await ctx.db
      .query("passportUploads")
      .withIndex("by_owner_and_storage", (q) =>
        q
          .eq("ownerTokenIdentifier", identity.tokenIdentifier)
          .eq("storageId", args.storageId),
      )
      .unique();
    if (!upload) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This passport image is not available to your account.",
      });
    }

    const passportId = await ctx.db.insert("passports", {
      ...args,
      ownerTokenIdentifier: identity.tokenIdentifier,
    });
    await ctx.db.delete("passportUploads", upload._id);
    return passportId;
  },
});

export const findDuplicatePassportNumbers = query({
  args: {
    passportNumber: v.string(),
    excludeRecordId: v.optional(v.id("passports")),
  },
  handler: async (ctx, { passportNumber, excludeRecordId }) => {
    const identity = await requireIdentity(ctx);
    const normalizedNumber = normalizePassportNumber(passportNumber);
    if (!normalizedNumber) {
      return {
        matches: [],
        hasMore: false,
        checkedCount: 0,
        olderRecordsMayExist: false,
      };
    }

    const checkedRecords = await ctx.db
      .query("passports")
      .withIndex("by_owner", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(501);
    const recordsToCheck = checkedRecords.slice(0, 500);
    const matches = recordsToCheck
      .filter(
        (record) =>
          record._id !== excludeRecordId &&
          normalizePassportNumber(record.passportNumber) === normalizedNumber,
      )
      .slice(0, 4);

    return {
      matches: matches.slice(0, 3).map((record) => ({
        id: record._id,
        name: [record.givenNames, record.surname].filter(Boolean).join(" ").trim(),
      })),
      hasMore: matches.length > 3,
      checkedCount: recordsToCheck.length,
      olderRecordsMayExist: checkedRecords.length > 500,
    };
  },
});

export const update = mutation({
  args: { id: v.id("passports"), ...passportFields },
  handler: async (ctx, { id, ...fields }) => {
    const identity = await requireIdentity(ctx);
    validatePassportRecord(fields);
    const record = await ctx.db.get("passports", id);
    if (!record) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Record not found" });
    }
    if (record.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not authorized" });
    }
    await ctx.db.patch("passports", id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("passports") },
  handler: async (ctx, { id }) => {
    const identity = await requireIdentity(ctx);
    const record = await ctx.db.get("passports", id);
    if (!record) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Record not found" });
    }
    if (record.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not authorized" });
    }
    await ctx.storage.delete(record.storageId);
    await ctx.db.delete("passports", id);
  },
});

type PassportWithImage = Doc<"passports"> & { imageUrl: string | null };

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const identity = await requireIdentity(ctx);
    const result = await ctx.db
      .query("passports")
      .withIndex("by_owner", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .paginate(paginationOpts);

    const page: PassportWithImage[] = await Promise.all(
      result.page.map(async (record) => ({
        ...record,
        imageUrl: await ctx.storage.getUrl(record.storageId),
      })),
    );

    return { ...result, page };
  },
});

// Records are per-user and bounded, so the whole set is safe to read at once.
// The table view filters and exports from this single result.
export const listAll = query({
  args: {},
  handler: async (ctx): Promise<PassportWithImage[]> => {
    const identity = await requireIdentity(ctx);
    const records = await ctx.db
      .query("passports")
      .withIndex("by_owner", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(500);

    return await Promise.all(
      records.map(async (record) => ({
        ...record,
        imageUrl: await ctx.storage.getUrl(record.storageId),
      })),
    );
  },
});
