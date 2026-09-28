import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    plan: v.optional(
      v.union(v.literal("free"), v.literal("pro"), v.literal("business")),
    ),
  }).index("by_token", ["tokenIdentifier"]),

  scanUsage: defineTable({
    ownerTokenIdentifier: v.string(),
    month: v.string(), // UTC calendar month, "YYYY-MM"
    count: v.number(),
  }).index("by_owner_and_month", ["ownerTokenIdentifier", "month"]),

  passportBatches: defineTable({
    ownerTokenIdentifier: v.string(),
    batchId: v.string(),
    scanCount: v.number(),
    expiresAt: v.string(),
  })
    .index("by_owner_and_batch", ["ownerTokenIdentifier", "batchId"])
    .index("by_owner_and_expiry", ["ownerTokenIdentifier", "expiresAt"]),

  passportUploadTickets: defineTable({
    ownerTokenIdentifier: v.string(),
    batchId: v.string(),
    uploadToken: v.string(),
    expiresAt: v.string(),
  })
    .index("by_owner_and_token", ["ownerTokenIdentifier", "uploadToken"])
    .index("by_owner_and_batch", ["ownerTokenIdentifier", "batchId"])
    .index("by_owner_and_expiry", ["ownerTokenIdentifier", "expiresAt"]),

  passportUploads: defineTable({
    ownerTokenIdentifier: v.string(),
    batchId: v.string(),
    storageId: v.id("_storage"),
    expiresAt: v.string(),
  })
    .index("by_storage", ["storageId"])
    .index("by_owner_and_storage", ["ownerTokenIdentifier", "storageId"])
    .index("by_owner_and_batch", ["ownerTokenIdentifier", "batchId"])
    .index("by_owner_and_expiry", ["ownerTokenIdentifier", "expiresAt"]),

  passports: defineTable({
    ownerTokenIdentifier: v.string(),
    storageId: v.id("_storage"),
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
    confidence: v.number(),
    notes: v.string(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_storage", ["storageId"]),
});
