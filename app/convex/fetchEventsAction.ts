import { action } from "./_generated/server";
import { Server } from "@stellar/stellar-sdk/rpc";
import { xdr, scValToNative } from "@stellar/stellar-sdk";

export const fetchEventsAction = action({
  args: {},
  handler: async (ctx, args) => {
    console.log("We are working");

    const server = new Server("https://soroban-testnet.stellar.org");

    let { events, latestLedger } = await server.getEvents({
      startLedger: 1154029,
      filters: [
        {
          type: "contract",
          contractIds: [
            "CDYCNSZQKLQ6J5QFK4B4RKSMEKTCFOQFSW4L4G7J7C36PLDKUBFKHVRH",
          ],
        },
      ],
    });
    console.log("Latest Ledger: ", latestLedger);
    console.log(
      "Events: ",
      events.map((event) => {
        return {
          topic_1:
            scValToNative(
              xdr.ScVal.fromXDR(event.topic[0]?.toXDR("base64"), "base64"),
            ) || null,
          value:
            scValToNative(
              xdr.ScVal.fromXDR(event.value.toXDR("base64"), "base64"),
            ) || null,
        };
      }),
    );
  },
});
