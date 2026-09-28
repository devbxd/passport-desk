import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { DEFAULT_PLAN, PLAN_SCAN_LIMITS, type PlanId } from "./lib/plans";

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

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

async function getPlanForOwner(
  ctx: MutationCtx,
  ownerTokenIdentifier: string,
): Promise<PlanId> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", ownerTokenIdentifier))
    .unique();
  return user?.plan ?? DEFAULT_PLAN;
}

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const month = currentMonth();
    const [user, usage] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique(),
      ctx.db
        .query("scanUsage")
        .withIndex("by_owner_and_month", (q) =>
          q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("month", month),
        )
        .unique(),
    ]);

    const plan = user?.plan ?? DEFAULT_PLAN;
    const limit = PLAN_SCAN_LIMITS[plan];
    const used = usage?.count ?? 0;

    return {
      plan,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      limitReached: used >= limit,
      month,
    };
  },
});

// Called from the passport scan action before spending AI credits on extraction.
// Throws when the caller's monthly plan limit has already been reached, so
// scanning stops before an image is processed.
export const consumeScan = internalMutation({
  args: { ownerTokenIdentifier: v.string() },
  handler: async (ctx, { ownerTokenIdentifier }) => {
    const month = currentMonth();
    const plan = await getPlanForOwner(ctx, ownerTokenIdentifier);
    const limit = PLAN_SCAN_LIMITS[plan];

    const usage = await ctx.db
      .query("scanUsage")
      .withIndex("by_owner_and_month", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("month", month),
      )
      .unique();
    const used = usage?.count ?? 0;

    if (used >= limit) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: `You've reached your plan's limit of ${limit} scans this month.`,
        data: { reason: "SCAN_LIMIT_REACHED", plan, limit },
      });
    }

    if (usage) {
      await ctx.db.patch("scanUsage", usage._id, { count: used + 1 });
    } else {
      await ctx.db.insert("scanUsage", {
        ownerTokenIdentifier,
        month,
        count: 1,
      });
    }
  },
});

export const getUsageForOwner = internalQuery({
  args: { ownerTokenIdentifier: v.string() },
  handler: async (ctx, { ownerTokenIdentifier }) => {
    const month = currentMonth();
    const [user, usage] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", ownerTokenIdentifier))
        .unique(),
      ctx.db
        .query("scanUsage")
        .withIndex("by_owner_and_month", (q) =>
          q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("month", month),
        )
        .unique(),
    ]);
    const plan = user?.plan ?? DEFAULT_PLAN;
    const limit = PLAN_SCAN_LIMITS[plan];
    const used = usage?.count ?? 0;
    return { plan, limit, used, limitReached: used >= limit };
  },
});

// Dev/support-only helper until a payment provider exists: lets an
// authenticated user set their own plan. Intentionally unauthenticated
// against a payment source since there is no billing to verify against yet.
export const setMyPlan = mutation({
  args: { plan: v.union(v.literal("free"), v.literal("pro"), v.literal("business")) },
  handler: async (ctx, { plan }) => {
    const identity = await requireIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    }
    await ctx.db.patch("users", user._id, { plan });
  },
});
