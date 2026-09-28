import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";
import schema from "./schema";

function signIn(t: ReturnType<typeof convexTest>, email: string, id = "user-1") {
  return t.withIdentity({
    subject: id,
    tokenIdentifier: `https://issuer.test|${id}`,
    email,
    name: "Test User",
  });
}

describe("granting a plan by email", () => {
  it("upgrades an existing account, ignoring case and spaces in the email", async () => {
    const t = convexTest(schema, modules);
    const user = signIn(t, "client@example.com");
    await user.mutation(api.users.updateCurrentUser, {});
    expect((await user.query(api.scanUsage.getUsage, {})).plan).toBe("free");

    const result = await t.mutation(internal.plans.grantByEmail, {
      email: "  Client@Example.COM ",
      plan: "pro",
    });

    expect(result.status).toBe("applied");
    const usage = await user.query(api.scanUsage.getUsage, {});
    expect(usage.plan).toBe("pro");
    expect(usage.limit).toBe(150);
  });

  it("holds the plan for someone who hasn't signed up and applies it on first sign-in", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(internal.plans.grantByEmail, {
      email: "later@example.com",
      plan: "business",
      days: 30,
    });
    expect(result.status).toBe("pending");

    const user = signIn(t, "later@example.com", "user-2");
    await user.mutation(api.users.updateCurrentUser, {});

    const usage = await user.query(api.scanUsage.getUsage, {});
    expect(usage.plan).toBe("business");
    expect(usage.limit).toBe(600);

    // The grant is consumed: it can't be replayed on another account.
    const leftovers = await t.run((ctx) => ctx.db.query("planGrants").collect());
    expect(leftovers).toHaveLength(0);
  });

  it("falls back to the free plan once the paid period is over", async () => {
    const t = convexTest(schema, modules);
    const user = signIn(t, "expired@example.com");
    await user.mutation(api.users.updateCurrentUser, {});
    await t.mutation(internal.plans.grantByEmail, {
      email: "expired@example.com",
      plan: "pro",
      days: 30,
    });
    expect((await user.query(api.scanUsage.getUsage, {})).plan).toBe("pro");

    await t.run(async (ctx) => {
      const row = await ctx.db.query("users").first();
      await ctx.db.patch("users", row!._id, {
        planExpiresAt: new Date(Date.now() - 1000).toISOString(),
      });
    });

    const usage = await user.query(api.scanUsage.getUsage, {});
    expect(usage.plan).toBe("free");
    expect(usage.limit).toBe(10);
  });

  it("keeps a permanent plan when no duration is given", async () => {
    const t = convexTest(schema, modules);
    const user = signIn(t, "forever@example.com");
    await user.mutation(api.users.updateCurrentUser, {});
    await t.mutation(internal.plans.grantByEmail, {
      email: "forever@example.com",
      plan: "pro",
    });
    const row = await t.run((ctx) => ctx.db.query("users").first());
    expect(row?.planExpiresAt).toBeUndefined();
    expect((await user.query(api.scanUsage.getUsage, {})).plan).toBe("pro");
  });

  it("rejects malformed emails and durations", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.plans.grantByEmail, { email: "not-an-email", plan: "pro" }),
    ).rejects.toThrow();
    await expect(
      t.mutation(internal.plans.grantByEmail, { email: "a@b.co", plan: "pro", days: -5 }),
    ).rejects.toThrow();
  });
});
