import { action, httpAction } from "./_generated/server";
import { Server } from "@stellar/stellar-sdk/rpc";
import { xdr, scValToNative } from "@stellar/stellar-sdk";
import { api } from "./_generated/api";

export const syncAction = httpAction(async (ctx, request) => {
  await ctx.runAction(api.fetchEventsAction2.syncEventsAction, {});
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
});
