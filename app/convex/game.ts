import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Validators ────────────────────────────────────────────────────────────────

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

const board = v.array(v.array(tile));

const gameState = v.union(
  v.literal("Lobby"),
  v.literal("Commiting"),
  v.literal("Playing"),
  v.literal("Abandoned"),
  v.literal("Ended"),
);

const gameResult = v.union(
  v.literal("Ongoing"),
  v.literal("Player1"),
  v.literal("Player2"),
  v.literal("Draw"),
);

const roundEntry = v.object({
  round: v.number(),
  player_address: v.string(),
  player_number: v.number(),
  x: v.number(),
  y: v.number(),
  previous_tile_is_mine: v.boolean(),
  next_round_tile_revealed_value: v.number(),
  next_player_turn: v.number(),
  next_move_window: v.number(),
});

// ── Queries ───────────────────────────────────────────────────────────────────

/** Get a single game by its on-chain ID */
export const getGame = query({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    return await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();
  },
});

/** Get all games */
export const getAllGames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("games").collect();
  },
});

/** Get all games for a player (player1 or player2) */
export const getGamesByPlayer = query({
  args: { player: v.string() },
  handler: async (ctx, { player }) => {
    const asPlayer1 = await ctx.db
      .query("games")
      .withIndex("by_player1", (q) => q.eq("player1", player))
      .collect();
    const asPlayer2 = await ctx.db
      .query("games")
      .withIndex("by_player2", (q) => q.eq("player2", player))
      .collect();
    return [...asPlayer1, ...asPlayer2];
  },
});

/** Get all games in a specific state */
export const getGamesByState = query({
  args: { game_state: gameState },
  handler: async (ctx, { game_state }) => {
    return await ctx.db
      .query("games")
      .withIndex("by_game_state", (q) => q.eq("game_state", game_state))
      .collect();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Called when GameProposed fires.
 * Creates the initial game record in the Lobby state.
 */
export const createGame = mutation({
  args: {
    id: v.number(),
    initial_lives: v.number(),
    initial_rounds: v.number(),
    stake: v.string(), // serialized BigInt, e.g. "10"
    player1: v.string(),
    player2: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", args.id))
      .unique();

    if (existing) {
      throw new Error(`Game ${args.id} already exists`);
    }

    return await ctx.db.insert("games", {
      game_id: args.id,
      initial_lives: args.initial_lives,
      initial_rounds: args.initial_rounds,
      stake: args.stake,
      player1: args.player1,
      player2: args.player2,
      current_lives: args.initial_lives,
      current_round: 0,
      game_state: "Lobby",
      result: "Ongoing",
      board: undefined,
      rounds: [],
    });
  },
});

/**
 * Called when GameJoined fires.
 * Confirms player2 has joined and moves state to Commiting.
 */
export const joinGame = mutation({
  args: {
    id: v.number(),
    player2: v.string(),
    board,
  },
  handler: async (ctx, { id, player2, board }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();

    if (!game) throw new Error(`Game ${id} not found`);

    await ctx.db.patch(game._id, {
      player2,
      board,
      game_state: "Commiting",
    });
  },
});

/**
 * Called when BoardInitialized fires.
 * Updates the board (may fire after join in some flows).
 */
export const setBoardInitialized = mutation({
  args: {
    id: v.number(),
    board,
  },
  handler: async (ctx, { id, board }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();

    if (!game) throw new Error(`Game ${id} not found`);

    await ctx.db.patch(game._id, { board });
  },
});

/**
 * Called when GameStarted fires.
 * Moves state from Commiting → Playing.
 */
export const startGame = mutation({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();

    if (!game) throw new Error(`Game ${id} not found`);

    await ctx.db.patch(game._id, { game_state: "Playing" });
  },
});

/**
 * Called when TurnPlayed fires.
 * Appends the round and updates the board + current state.
 */
export const recordTurn = mutation({
  args: {
    game_id: v.number(),
    next_round_x: v.number(),
    next_round_y: v.number(),
    player_address: v.string(),
    player_number: v.number(),
    previous_tile_is_mine: v.boolean(),
    next_round_tile_revealed_value: v.number(),
    next_player_turn: v.number(),
    next_move_window: v.number(),
    board,
    // current game state after the turn
    current_lives: v.number(),
    current_round: v.number(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", args.game_id))
      .unique();

    if (!game) throw new Error(`Game ${args.game_id} not found`);

    const newRound = {
      round: args.current_round,
      player_address: args.player_address,
      player_number: args.player_number,
      x: args.next_round_x,
      y: args.next_round_y,
      previous_tile_is_mine: args.previous_tile_is_mine,
      next_round_tile_revealed_value: args.next_round_tile_revealed_value,
      next_player_turn: args.next_player_turn,
      next_move_window: args.next_move_window,
    };

    await ctx.db.patch(game._id, {
      board: args.board,
      current_lives: args.current_lives,
      current_round: args.current_round,
      rounds: [...game.rounds, newRound],
    });
  },
});

/**
 * Called when GameAbandoned fires.
 */
export const abandonGame = mutation({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();

    if (!game) throw new Error(`Game ${id} not found`);

    await ctx.db.patch(game._id, {
      game_state: "Abandoned",
      result: "Ongoing", // no winner on abandon
    });
  },
});

/**
 * Called when GameEnded fires.
 * Sets final result and moves state to Ended.
 */
export const endGame = mutation({
  args: {
    id: v.number(),
    result: gameResult,
  },
  handler: async (ctx, { id, result }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();

    if (!game) throw new Error(`Game ${id} not found`);

    await ctx.db.patch(game._id, {
      game_state: "Ended",
      result,
    });
  },
});

export const setWinnerAwarded = mutation({
  args: {
    id: v.number(),
    player_1_payout: v.string(),
    player_2_payout: v.string(),
  },
  handler: async (ctx, { id, player_1_payout, player_2_payout }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();
    if (!game) throw new Error(`Game ${id} not found`);
    await ctx.db.patch(game._id, {
      winner_awarded: { player_1_payout, player_2_payout },
    });
  },
});

export const setMinesCommited = mutation({
  args: {
    id: v.number(),
    mines: v.string(),
    player: v.number(), // 1 or 2
  },
  handler: async (ctx, { id, mines, player }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_id", (q) => q.eq("game_id", id))
      .unique();
    if (!game) throw new Error(`Game ${id} not found`);
    const current = game.mines_commited ?? {};
    await ctx.db.patch(game._id, {
      mines_commited: {
        ...current,
        ...(player === 1 ? { player1_mines: mines } : { player2_mines: mines }),
      },
    });
  },
});
