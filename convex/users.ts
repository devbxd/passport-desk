import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { expiryFromDays } from "./lib/plans";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      return user._id;
    }
    // If it's a new identity, create a new User. If a plan was granted to this
    // email before they signed up, it is applied now and the grant consumed.
    const email = identity.email?.trim().toLowerCase();
    const grant = email
      ? await ctx.db
          .query("planGrants")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first()
      : null;
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email,
      tokenIdentifier: identity.tokenIdentifier,
      ...(grant
        ? { plan: grant.plan, planExpiresAt: expiryFromDays(grant.days) }
        : {}),
    });
    if (grant) await ctx.db.delete("planGrants", grant._id);
    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Called getCurrentUser without authentication present",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    return user;
  },
});
