import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { modules } from "./test.setup";
import schema from "./schema";

const createTestBackend = () => convexTest(schema, modules);
type TestBackend = ReturnType<typeof createTestBackend>;
type TestUser = ReturnType<TestBackend["withIdentity"]>;

const PASSPORT_FIELDS = {
  surname: "DOE",
  givenNames: "JANE",
  passportNumber: "AB123",
  nationality: "Exampleland",
  issuingCountry: "Exampleland",
  dateOfBirth: "2000-02-29",
  sex: "F",
  placeOfBirth: "Example City",
  dateOfIssue: "2020-01-01",
  dateOfExpiry: "2030-01-01",
  documentType: "Passport",
  personalNumber: "",
  mrz: "P<EXADOE<<JANE",
  notes: "",
};

async function storeTestImage(t: TestBackend) {
  return await t.run(async (ctx) =>
    ctx.storage.store(new Blob(["test passport image"])),
  );
}

async function createTrackedUpload(t: TestBackend, owner: TestUser) {
  const batchId = crypto.randomUUID();
  await owner.mutation(api.passports.startBatch, { batchId });
  const ticket = await owner.mutation(api.passports.createUploadTicket, { batchId });
  const storageId = await storeTestImage(t);
  await owner.mutation(api.passports.trackUpload, {
    storageId,
    uploadToken: ticket.uploadToken,
  });
  return { batchId, storageId };
}

describe("passport batch scanning", () => {
  it("starts the same account's batch idempotently", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const batchId = crypto.randomUUID();

    await owner.mutation(api.passports.startBatch, { batchId });
    await owner.mutation(api.passports.startBatch, { batchId });

    const batches = await t.run((ctx) => ctx.db.query("passportBatches").collect());
    expect(batches).toHaveLength(1);
    expect(batches[0]?.batchId).toBe(batchId);
  });

  it("tracks uploaded images only for the account that opened the batch", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const otherUser = t.withIdentity({ subject: "other-user" });
    const batchId = crypto.randomUUID();
    await owner.mutation(api.passports.startBatch, { batchId });
    const ticket = await owner.mutation(api.passports.createUploadTicket, { batchId });
    const storageId = await storeTestImage(t);

    await expect(
      otherUser.mutation(api.passports.trackUpload, {
        storageId,
        uploadToken: ticket.uploadToken,
      }),
    ).rejects.toThrow("This upload was not started by your account");

    await owner.mutation(api.passports.trackUpload, {
      storageId,
      uploadToken: ticket.uploadToken,
    });
  });

  it("reserves no more than ten uploads per batch", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const batchId = crypto.randomUUID();
    await owner.mutation(api.passports.startBatch, { batchId });

    for (let index = 0; index < 10; index += 1) {
      await owner.mutation(api.passports.createUploadTicket, { batchId });
    }

    await expect(
      owner.mutation(api.passports.createUploadTicket, { batchId }),
    ).rejects.toThrow("up to 10 passport scans");
  });

  it("releases a scan slot when an upload is removed", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const batchId = crypto.randomUUID();
    await owner.mutation(api.passports.startBatch, { batchId });

    for (let index = 0; index < 10; index += 1) {
      const ticket = await owner.mutation(api.passports.createUploadTicket, { batchId });
      const storageId = await storeTestImage(t);
      await owner.mutation(api.passports.trackUpload, {
        storageId,
        uploadToken: ticket.uploadToken,
      });
      if (index === 0) {
        await owner.mutation(api.passports.discardUpload, { batchId, storageId });
      }
    }

    const remainingTicket = await owner.mutation(
      api.passports.createUploadTicket,
      { batchId },
    );
    expect(remainingTicket.uploadToken).toBeTruthy();
  });

  it("cleans expired batches, upload tickets, and temporary images on demand", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const { batchId, storageId } = await createTrackedUpload(t, owner);
    const pendingTicket = await owner.mutation(
      api.passports.createUploadTicket,
      { batchId },
    );

    await t.run(async (ctx) => {
      const batches = await ctx.db.query("passportBatches").collect();
      const batch = batches.find((entry) => entry.batchId === batchId);
      if (!batch) throw new Error("Test batch was not found");
      const pastExpiry = new Date(Date.now() - 1000).toISOString();
      await ctx.db.patch("passportBatches", batch._id, { expiresAt: pastExpiry });

      const uploads = await ctx.db.query("passportUploads").collect();
      const upload = uploads.find((entry) => entry.storageId === storageId);
      if (!upload) throw new Error("Test upload was not found");
      await ctx.db.patch("passportUploads", upload._id, { expiresAt: pastExpiry });

      const tickets = await ctx.db.query("passportUploadTickets").collect();
      const ticket = tickets.find(
        (entry) => entry.uploadToken === pendingTicket.uploadToken,
      );
      if (!ticket) throw new Error("Test upload ticket was not found");
      await ctx.db.patch("passportUploadTickets", ticket._id, { expiresAt: pastExpiry });
    });

    await expect(owner.mutation(api.passports.cleanupExpiredUploads, {})).resolves.toBe(1);
    const remaining = await t.run(async (ctx) => ({
      batches: await ctx.db.query("passportBatches").collect(),
      uploads: await ctx.db.query("passportUploads").collect(),
      tickets: await ctx.db.query("passportUploadTickets").collect(),
      imageUrl: await ctx.storage.getUrl(storageId),
    }));
    expect(remaining).toEqual({ batches: [], uploads: [], tickets: [], imageUrl: null });
  });

  it("preserves a saved passport image when its batch is closed", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const { batchId, storageId } = await createTrackedUpload(t, owner);
    await owner.mutation(api.passports.create, {
      storageId,
      confidence: 95,
      ...PASSPORT_FIELDS,
    });

    await expect(owner.mutation(api.passports.closeBatch, { batchId })).resolves.toBe(0);
    const imageUrl = await t.run((ctx) => ctx.storage.getUrl(storageId));
    expect(imageUrl).not.toBeNull();
  });

  it("removes temporary images and tickets when the owner finishes a batch", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const { batchId, storageId } = await createTrackedUpload(t, owner);

    await expect(
      t.withIdentity({ subject: "other-user" }).mutation(api.passports.closeBatch, {
        batchId,
      }),
    ).resolves.toBe(0);

    await expect(owner.mutation(api.passports.closeBatch, { batchId })).resolves.toBe(1);

    const remaining = await t.run(async (ctx) => {
      const batches = await ctx.db.query("passportBatches").collect();
      const uploads = await ctx.db.query("passportUploads").collect();
      const tickets = await ctx.db.query("passportUploadTickets").collect();
      const imageUrl = await ctx.storage.getUrl(storageId);
      return { batchCount: batches.length, uploadCount: uploads.length, ticketCount: tickets.length, imageUrl };
    });
    expect(remaining).toEqual({
      batchCount: 0,
      uploadCount: 0,
      ticketCount: 0,
      imageUrl: null,
    });
  });

  it("does not let another account discard an uploaded scan", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const otherUser = t.withIdentity({ subject: "other-user" });
    const { batchId, storageId } = await createTrackedUpload(t, owner);

    await expect(
      otherUser.mutation(api.passports.discardUpload, { batchId, storageId }),
    ).resolves.toBe(false);

    await owner.mutation(api.passports.create, {
      storageId,
      confidence: 95,
      ...PASSPORT_FIELDS,
    });
  });
});

describe("passport record verification", () => {
  it("finds case- and spacing-insensitive duplicates only within the signed-in account", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const otherUser = t.withIdentity({ subject: "other-user" });
    const { storageId } = await createTrackedUpload(t, owner);

    await owner.mutation(api.passports.create, {
      storageId,
      confidence: 95,
      ...PASSPORT_FIELDS,
      passportNumber: " ab 123 ",
    });

    const ownerMatches = await owner.query(
      api.passports.findDuplicatePassportNumbers,
      { passportNumber: "AB123" },
    );
    const otherUserMatches = await otherUser.query(
      api.passports.findDuplicatePassportNumbers,
      { passportNumber: "AB123" },
    );

    expect(ownerMatches.matches).toHaveLength(1);
    expect(ownerMatches.matches[0]?.name).toBe("JANE DOE");
    expect(otherUserMatches.matches).toHaveLength(0);
  });

  it("does not report the current record as a duplicate while editing", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const { storageId } = await createTrackedUpload(t, owner);
    const recordId = await owner.mutation(api.passports.create, {
      storageId,
      confidence: 95,
      ...PASSPORT_FIELDS,
    });

    const result = await owner.query(
      api.passports.findDuplicatePassportNumbers,
      { passportNumber: "ab 123", excludeRecordId: recordId },
    );

    expect(result.matches).toHaveLength(0);
  });

  it("rejects incomplete or chronologically impossible passport data", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const storageId = await storeTestImage(t);

    await expect(
      owner.mutation(api.passports.create, {
        storageId,
        confidence: 95,
        ...PASSPORT_FIELDS,
        surname: "  ",
      }),
    ).rejects.toThrow("Surname is required");

    await expect(
      owner.mutation(api.passports.create, {
        storageId,
        confidence: 95,
        ...PASSPORT_FIELDS,
        dateOfIssue: "1999-12-31",
      }),
    ).rejects.toThrow("Date of issue cannot be earlier than date of birth");
  });

  it("requires authentication for duplicate checks", async () => {
    const t = createTestBackend();

    await expect(
      t.query(api.passports.findDuplicatePassportNumbers, {
        passportNumber: "AB123",
      }),
    ).rejects.toThrow("Please sign in to continue");
  });
});

describe("Arabic passport fields", () => {
  it("saves and updates the Arabic text alongside the Latin fields", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const { storageId } = await createTrackedUpload(t, owner);

    const id = await owner.mutation(api.passports.create, {
      storageId,
      confidence: 95,
      ...PASSPORT_FIELDS,
      surnameAr: "بن علي",
      givenNamesAr: "محمد",
      fatherNameAr: "أحمد",
    });
    await owner.mutation(api.passports.update, {
      id,
      ...PASSPORT_FIELDS,
      surnameAr: "بن علي",
      givenNamesAr: "محمد الأمين",
      fatherNameAr: "أحمد",
    });

    const [record] = await owner.query(api.passports.listAll, {});
    expect(record?.surnameAr).toBe("بن علي");
    expect(record?.givenNamesAr).toBe("محمد الأمين");
    expect(record?.fatherNameAr).toBe("أحمد");
  });

  it("still accepts records saved without any Arabic fields", async () => {
    const t = createTestBackend();
    const owner = t.withIdentity({ subject: "owner" });
    const { storageId } = await createTrackedUpload(t, owner);

    await owner.mutation(api.passports.create, {
      storageId,
      confidence: 95,
      ...PASSPORT_FIELDS,
    });

    const [record] = await owner.query(api.passports.listAll, {});
    expect(record?.surnameAr).toBeUndefined();
  });
});
