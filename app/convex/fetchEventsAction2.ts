import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Server } from "@stellar/stellar-sdk/rpc";
import { xdr, scValToNative } from "@stellar/stellar-sdk";

// ── Types ─────────────────────────────────────────────────────────────────────

type RawTileValue = ["Hidden"] | ["Empty"] | ["Number", number] | ["Mine"];

interface RawTile {
  revealed: boolean;
  value: RawTileValue;
}

type RawBoard = RawTile[][];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts the raw on-chain tile value (an array from scValToNative) into
 * the discriminated-union shape that Convex expects.
 */
function parseTileValue(raw: RawTileValue) {
  const tag = raw[0];
  switch (tag) {
    case "Hidden":
      return { type: "Hidden" as const };
    case "Empty":
      return { type: "Empty" as const };
    case "Mine":
      return { type: "Mine" as const };
    case "Number":
      return { type: "Number" as const, value: raw[1] as number };
    default:
      throw new Error(`Unknown tile value tag: ${tag}`);
  }
}

/**
 * Converts the raw 9×9 board from scValToNative into the typed board shape.
 */
function parseBoard(raw: RawBoard) {
  return raw.map((row) =>
    row.map((tile) => ({
      revealed: tile.revealed,
      value: parseTileValue(tile.value),
    })),
  );
}

// ── Action ────────────────────────────────────────────────────────────────────

export const syncEventsAction = action({
  args: {},
  handler: async (ctx, {}) => {
    const server = new Server("https://soroban-testnet.stellar.org");
    const contractId =
      "CC2UFRAFXDNF6X7JU3VBIMK4S4XO4EDHDXJINUMD7HVKDHP5SKJQKNOT";
    const startLedger = await ctx.runQuery(api.ledger.getLastLedger);

    const { events, latestLedger } = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
        },
      ],
    });

    console.log(
      `Fetched ${events.length} events. Latest ledger: ${latestLedger}`,
    );

    // Parse all events into { topic, value } pairs
    const parsed = events.map((event) => {
      const topic = scValToNative(
        xdr.ScVal.fromXDR(event.topic[0]?.toXDR("base64"), "base64"),
      ) as string;
      const value = scValToNative(
        xdr.ScVal.fromXDR(event.value.toXDR("base64"), "base64"),
      );
      return { topic, value };
    });

    // Process each event and dispatch to the appropriate mutation
    for (const { topic, value } of parsed) {
      try {
        switch (topic) {
          // ── game_proposed ──────────────────────────────────────────────────
          case "game_proposed": {
            const v = value as {
              id: number;
              lives: number;
              rounds: number;
              stake: bigint;
              player1: string;
              player2: string;
            };
            await ctx.runMutation(api.game.createGame, {
              id: v.id,
              initial_lives: v.lives,
              initial_rounds: v.rounds,
              stake: v.stake.toString(),
              player1: v.player1,
              player2: v.player2,
            });
            console.log(`[game_proposed] Created game ${v.id}`);
            break;
          }

          // ── game_joined ────────────────────────────────────────────────────
          case "game_joined": {
            const v = value as {
              id: number;
              player2: string;
              board: RawBoard;
            };
            await ctx.runMutation(api.game.joinGame, {
              id: v.id,
              player2: v.player2,
              board: parseBoard(v.board),
            });
            console.log(`[game_joined] Game ${v.id} joined by ${v.player2}`);
            break;
          }

          // ── board_initialized ──────────────────────────────────────────────
          case "board_initialized": {
            const v = value as { game_id: number; board: RawBoard };
            await ctx.runMutation(api.game.setBoardInitialized, {
              id: v.game_id,
              board: parseBoard(v.board),
            });
            console.log(`[board_initialized] Board set for game ${v.game_id}`);
            break;
          }

          // ── game_started ───────────────────────────────────────────────────
          case "game_started": {
            const v = value as { id: number };
            await ctx.runMutation(api.game.startGame, { id: v.id });
            console.log(`[game_started] Game ${v.id} started`);
            break;
          }

          // ── turn_played ────────────────────────────────────────────────────
          case "turn_played": {
            const v = value as {
              game_id: number;
              next_round_x: number;
              next_round_y: number;
              player_address: string;
              player_number: number;
              previous_tile_is_mine: boolean;
              next_round_tile_revealed_value: number;
              next_player_turn: number;
              next_move_window: bigint;
              board: RawBoard;
              // These may or may not be present depending on your contract;
              // provide safe defaults if absent.
              current_lives?: number;
              current_round?: number;
            };
            await ctx.runMutation(api.game.recordTurn, {
              game_id: v.game_id,
              next_round_x: v.next_round_x,
              next_round_y: v.next_round_y,
              player_address: v.player_address,
              player_number: v.player_number,
              previous_tile_is_mine: v.previous_tile_is_mine,
              next_round_tile_revealed_value: v.next_round_tile_revealed_value,
              next_player_turn: v.next_player_turn,
              next_move_window: Number(v.next_move_window),
              board: parseBoard(v.board),
              current_lives: v.current_lives ?? 0,
              current_round: v.current_round ?? 0,
            });
            console.log(`[turn_played] Turn recorded for game ${v.game_id}`);
            break;
          }

          // ── game_abandoned ─────────────────────────────────────────────────
          case "game_abandoned": {
            const v = value as { id: number; abandoner: number };
            await ctx.runMutation(api.game.abandonGame, { id: v.id });
            console.log(`[game_abandoned] Game ${v.id} abandoned`);
            break;
          }

          // ── game_ended ─────────────────────────────────────────────────────
          case "game_ended": {
            const v = value as {
              id: number;
              result: "Ongoing" | "Player1" | "Player2" | "Draw";
            };
            await ctx.runMutation(api.game.endGame, {
              id: v.id,
              result: v.result,
            });
            console.log(
              `[game_ended] Game ${v.id} ended with result: ${v.result}`,
            );
            break;
          }

          case "winner_awarded": {
            const v = value as {
              id: number;
              result: "Ongoing" | "Player1" | "Player2" | "Draw";
              player_1: bigint;
              player_2: bigint;
            };
            await ctx.runMutation(api.game.setWinnerAwarded, {
              id: v.id,
              player_1_payout: v.player_1.toString(),
              player_2_payout: v.player_2.toString(),
            });
            break;
          }

          case "mines_commited": {
            const v = value as { id: number; mines: string; player: number };
            await ctx.runMutation(api.game.setMinesCommited, {
              id: v.id,
              mines: v.mines,
              player: v.player,
            });
            break;
          }

          default:
            console.warn(`[syncEventsAction] Unknown event topic: "${topic}"`);
        }
      } catch (err) {
        // Log but don't throw — one bad event shouldn't stop the rest
        console.error(
          `[syncEventsAction] Failed to process event "${topic}":`,
          err,
        );
      }
    }

    await ctx.runMutation(api.ledger.setLastLedger, {
      last_ledger_number: latestLedger,
    });
    return { processed: parsed.length, latestLedger };
  },
});
