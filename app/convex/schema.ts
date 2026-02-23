// scheme.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const tileValue = v.union(
  v.object({ type: v.literal("Hidden") }),
  v.object({ type: v.literal("Empty") }),
  v.object({ type: v.literal("Number"), value: v.number() }),
  v.object({ type: v.literal("Mine") }),
);

const tile = v.object({
  revealed: v.boolean(),
  value: tileValue,
});

export default defineSchema({
  games: defineTable({
    game_id: v.number(),
    // After the `result` field
    winner_awarded: v.optional(
      v.object({
        player_1_payout: v.string(), // BigInt as string
        player_2_payout: v.string(), // BigInt as string
      }),
    ),
    current_player_turn: v.number(), // defaults to 0 (player 1) until first TurnPlayed
    player_1_lives: v.number(),
    player_2_lives: v.number(),
    current_round: v.number(), // you already have this, just confirming it stays

    mines_commited: v.optional(
      v.object({
        player1_mines: v.optional(v.string()), // raw Bytes as hex/base64 string
        player2_mines: v.optional(v.string()),
      }),
    ),

    // Immutable config (set on GameProposed)
    initial_lives: v.number(),
    initial_rounds: v.number(),
    stake: v.string(), // BigInt serialized as string, e.g. "10"
    player1: v.string(),
    player2: v.optional(v.string()),

    // Mutable state
    current_lives: v.number(),

    game_state: v.union(
      v.literal("Lobby"),
      v.literal("Commiting"),
      v.literal("Playing"),
      v.literal("Abandoned"),
      v.literal("Ended"),
    ),
    result: v.union(
      v.literal("Ongoing"),
      v.literal("Player1"),
      v.literal("Player2"),
      v.literal("Draw"),
    ),

    // 9x9 board stored as structured JSON
    board: v.optional(v.array(v.array(tile))),
    current_round_move_window: v.optional(v.number()),
    commit_move_window: v.optional(v.number()),

    // Append-only log of turns played (TurnPlayed events)
    rounds: v.array(
      v.object({
        round: v.number(),
        player_address: v.string(),
        player_number: v.number(),
        x: v.number(),
        y: v.number(),
        previous_tile_is_mine: v.boolean(),
        next_round_tile_revealed_value: v.number(),
        next_player_turn: v.number(),
        next_move_window: v.number(),
      }),
    ),
  })
    .index("by_game_id", ["game_id"])
    .index("by_player1", ["player1"])
    .index("by_player2", ["player2"])
    .index("by_game_state", ["game_state"]),

  ledger: defineTable({
    last_ledger_number: v.number(),
  }),
});
