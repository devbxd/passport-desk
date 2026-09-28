import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { expiryFromDays } from "./lib/plans";

// Internal on purpose: it can't be called from the browser, only by an
// operator (Convex dashboard "Run function" or `convex run`). It is how a
// payment made outside the app gets turned into access.
export const grantByEmail = internalMutation({
  args: {
    email: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("business")),
    // Number of days the plan lasts. Leave out for a permanent plan.
    days: v.optional(v.number()),
  },
  handler: async (ctx, { email, plan, days }) => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: `"${email}" is not a valid email address`,
      });
    }
    if (days !== undefined && (!Number.isFinite(days) || days <= 0)) {
      throw new ConvexError({
        code: "INVALID_DAYS",
        message: "days must be a positive number",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();

    if (user) {
      await ctx.db.patch("users", user._id, {
        plan,
        planExpiresAt: expiryFromDays(days),
      });
      return { status: "applied" as const, email: normalized, plan, days: days ?? null };
    }

    // No account yet: keep the grant, it activates on their first sign-in.
    const existing = await ctx.db
      .query("planGrants")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .collect();
    for (const grant of existing) await ctx.db.delete("planGrants", grant._id);
    await ctx.db.insert("planGrants", { email: normalized, plan, days });
    return { status: "pending" as const, email: normalized, plan, days: days ?? null };
  },
});
