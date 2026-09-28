import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";
import schema from "./schema";

const TOKEN = "https://issuer.test|user-1";

function setup() {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "user-1", tokenIdentifier: TOKEN });
  return { t, user };
}

describe("scan quota", () => {
  it("counts each consumed scan against the monthly limit", async () => {
    const { t, user } = setup();
    await t.mutation(internal.scanUsage.consumeScan, { ownerTokenIdentifier: TOKEN });
    await t.mutation(internal.scanUsage.consumeScan, { ownerTokenIdentifier: TOKEN });

    const usage = await user.query(api.scanUsage.getUsage, {});
    expect(usage.used).toBe(2);
  });

  it("gives a scan back when it is refunded, and never goes below zero", async () => {
    const { t, user } = setup();
    await t.mutation(internal.scanUsage.consumeScan, { ownerTokenIdentifier: TOKEN });
    await t.mutation(internal.scanUsage.refundScan, { ownerTokenIdentifier: TOKEN });
    expect((await user.query(api.scanUsage.getUsage, {})).used).toBe(0);

    await t.mutation(internal.scanUsage.refundScan, { ownerTokenIdentifier: TOKEN });
    expect((await user.query(api.scanUsage.getUsage, {})).used).toBe(0);
  });

  it("does not let a signed-in user change their own plan", () => {
    // Plans are only changed by us until billing exists; there must be no
    // public function that lets a user upgrade themselves for free.
    expect("setMyPlan" in api.scanUsage).toBe(false);
  });
});
