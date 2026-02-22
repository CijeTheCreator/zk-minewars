import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getLastLedger = query({
  args: {},
  handler: async (ctx) => {
    const ledger = await ctx.db.query("ledger").first();
    return ledger?.last_ledger_number ?? 1154029;
  },
});

export const setLastLedger = mutation({
  args: { last_ledger_number: v.number() },
  handler: async (ctx, { last_ledger_number }) => {
    const existing = await ctx.db.query("ledger").first();
    if (existing) {
      await ctx.db.patch(existing._id, { last_ledger_number });
    } else {
      await ctx.db.insert("ledger", { last_ledger_number });
    }
  },
});
