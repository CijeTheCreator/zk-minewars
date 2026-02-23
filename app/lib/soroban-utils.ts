import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

import { CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  rpc as StellarRpc,
  nativeToScVal,
  Address,
  scValToNative,
} from "@stellar/stellar-sdk";
import {
  Barretenberg,
  BarretenbergSync,
  Fr,
  UltraHonkBackend,
} from "@aztec/bb.js";
import circuit from "@/lib/circuits.json";

// handleTransaction now accepts an object with name and args
export async function handleTransaction({
  name,
  args,
}: {
  name: string;
  args: StellarSdk.xdr.ScVal[];
}) {
  const server = new StellarRpc.Server("https://soroban-testnet.stellar.org");
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;
  const contract = new Contract(contractId);
  await setAllowed();
  const { address } = await getAddress();
  console.log(address);
  const account = await server.getAccount(address);

  const operation = contract.call(name, ...args); // contract.call moved here

  const tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
  const preparedTx = await server.prepareTransaction(tx);
  const signedTransaction = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: StellarSdk.Networks.TESTNET,
  });
  const transactionResult = await server.sendTransaction(
    StellarSdk.TransactionBuilder.fromXDR(
      signedTransaction.signedTxXdr,
      StellarSdk.Networks.TESTNET,
    ),
  );
  console.log("Transaction submitted:", transactionResult);
  const txHash = transactionResult.hash;

  const pollTransaction = async (hash: string) => {
    const MAX_RETRIES = 20;
    const POLL_INTERVAL_MS = 3000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const txResponse = await server.getTransaction(hash);
      console.log(`Poll attempt ${attempt} - Status:`, txResponse.status);
      if (txResponse.status === "SUCCESS") {
        console.log("Transaction confirmed!", txResponse);
        const contractEventsXdrs = txResponse.events.contractEventsXdr[0].map(
          (unprocessedContractEvent) => {
            const contractEvent = StellarSdk.xdr.ContractEvent.fromXDR(
              unprocessedContractEvent.toXDR(),
            );
            const eventV0 = contractEvent.body().value();
            const eventName = scValToNative(eventV0.topics()[0]);
            const eventData = contractEvent.body().value().data();
            const data = scValToNative(eventData) || null;
            return { eventName, eventData: data };
          },
        );
        return { txHash, events: contractEventsXdrs };
      }
      if (txResponse.status === "FAILED") {
        console.error("Transaction failed:", txResponse);
        throw new Error(`Transaction failed: ${txResponse}`);
      }
      console.log("Still pending, retrying...");
    }
    throw new Error("Transaction polling timed out after max retries");
  };

  const transactionData = await pollTransaction(txHash);
  await fetch("https://oceanic-lemming-747.convex.site/sync");
  return transactionData;
}

export async function commitMines({
  gameId,
  playerAddress,
  playerNumber,
  minePositions,
  nullifier,
}: {
  gameId: number;
  playerAddress: string;
  playerNumber: number;
  minePositions: Array<{ x: number; y: number }>;
  nullifier: Fr;
}) {
  const bb = await Barretenberg.new();

  // Build the hash inputs matching the Noir order:
  // [mines[0].x, mines[0].y, ..., mines[4].x, mines[4].y, nullifier]
  const hashInputs: Fr[] = [
    ...minePositions.flatMap(({ x, y }) => [
      new Fr(BigInt(x)),
      new Fr(BigInt(y)),
    ]),
    nullifier,
  ];

  // Poseidon2 hash of all mine positions + nullifier
  const commitment: Fr = await bb.poseidon2Hash(hashInputs);

  saveMineData(minePositions, nullifier.toString(), commitment.toString());

  // Encode as bytes: commitment (32 bytes) + nullifier (32 bytes)
  // This gives the contract the data it needs to verify later
  const commitmentBuffer = commitment.toBuffer();

  const privateMinesBytes = Buffer.concat([commitmentBuffer]).toString("hex");

  const result = await handleTransaction({
    name: "commit_mines",
    args: [
      nativeToScVal(gameId, { type: "u32" }),
      nativeToScVal(playerAddress, { type: "address" }),
      nativeToScVal(playerNumber, { type: "u32" }),
      nativeToScVal(commitmentBuffer, { type: "bytes" }),
    ],
  });

  return result;
}

export interface TileState {
  revealed: boolean;
  flagged: boolean;
  value: number | "mine" | null;
  isLoading: boolean;
  opponentClicked?: boolean;
}

export function convertBoard(
  board: {
    revealed: boolean;
    value: { type: "Hidden" | "Empty" | "Number" | "Mine"; value?: number };
  }[][],
  flagged: boolean[][],
): TileState[][] {
  return board.map((row, r) =>
    row.map((tile, c) => {
      const value: number | "mine" | null =
        tile.value.type === "Mine"
          ? "mine"
          : tile.value.type === "Number"
            ? tile.value.value!
            : tile.value.type === "Empty"
              ? null
              : null; // Hidden — value unknown, not yet revealed

      return {
        revealed: tile.revealed,
        flagged: flagged[r][c],
        value,
        isLoading: false,
      };
    }),
  );
}

export function countRevealedTiles(grid: TileState[][]): number {
  return grid.reduce(
    (count, row) => count + row.filter((tile) => tile.revealed).length,
    0,
  );
}

export async function playTurn({
  gameId,
  nextRoundX,
  nextRoundY,
  previousRoundX = 0,
  previousRoundY = 0,
  playerNumber,
  isFirstTurn,
}: {
  gameId: number;
  nextRoundX: number;
  nextRoundY: number;
  previousRoundX?: number;
  previousRoundY?: number;
  playerNumber: number;
  isFirstTurn: boolean;
}) {
  await isAllowed();
  const { address } = await getAddress();
  const { minePositions, commitment, nullifier } = getMineData();

  const commitmentFr: Fr = Fr.fromString(commitment);
  const nullifierFr: Fr = Fr.fromString(nullifier);

  const previousTileIsMine = isMine(previousRoundX, previousRoundY);
  const nextTileIsMine = isMine(nextRoundX, nextRoundY);
  const nextRoundTileRevealedValue = countAdjacentMines(
    nextRoundX,
    nextRoundY,
    minePositions,
  );

  // Proof generation
  const noir = new Noir(circuit as CompiledCircuit);
  const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });

  const buildInput = (
    x: number,
    y: number,
    adjacents: number,
    hit: boolean,
  ) => ({
    mines: toMines(minePositions),
    nullifier: nullifierFr.toString(),
    clicked_x: x.toString(),
    clicked_y: y.toString(),
    hit: hit,
    adjacents,
    commitment: commitmentFr.toString(),
  });

  let previousRoundProof = Buffer.alloc(32, 0);

  if (!isFirstTurn) {
    const previousTileRevealedValue = countAdjacentMines(
      previousRoundX,
      previousRoundY,
      minePositions,
    );
    const previousRoundInput = buildInput(
      previousRoundX,
      previousRoundY,
      previousTileRevealedValue,
      previousTileIsMine,
    );

    console.log("Generating Witness Previous");
    const { witness: witnessPrevious } = await noir.execute(previousRoundInput);
    console.log("Generating Proof Previous");
    const { proof: proofPrevious } = await honk.generateProof(witnessPrevious, {
      keccak: true,
    });
    previousRoundProof = Buffer.from(proofPrevious);
  }

  const nextRoundInput = buildInput(
    nextRoundX,
    nextRoundY,
    nextRoundTileRevealedValue,
    nextTileIsMine,
  );

  console.log("Next Round Value: ", nextRoundTileRevealedValue);

  console.log("Generating Witness Next");
  const { witness: witnessNext } = await noir.execute(nextRoundInput);
  console.log("Generating Proof Next");
  const { proof: proofNext, publicInputs } = await honk.generateProof(
    witnessNext,
    { keccak: true },
  );
  console.log("Proof Next: ", proofNext);

  const nextRoundProof = Buffer.from(proofNext);

  const result = await handleTransaction({
    name: "play_turn",
    args: [
      nativeToScVal(gameId, { type: "u32" }),
      nativeToScVal(nextRoundX, { type: "u32" }),
      nativeToScVal(nextRoundY, { type: "u32" }),
      nativeToScVal(address, { type: "address" }),
      nativeToScVal(playerNumber, { type: "u32" }),
      nativeToScVal(previousTileIsMine, { type: "bool" }), // ✅ PREVIOUS tile
      nativeToScVal(nextRoundTileRevealedValue, { type: "u32" }), // ✅ NEXT tile's value
      nativeToScVal(previousRoundProof, { type: "bytes" }),
      nativeToScVal(nextRoundProof, { type: "bytes" }),
    ],
  });

  return result;
}

export function countAdjacentMines(
  x: number,
  y: number,
  minePositions: Array<{ x: number; y: number }>,
): number {
  const mineSet = new Set(minePositions.map((pos) => `${pos.x},${pos.y}`));

  const directions = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  let count = 0;

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9) {
      if (mineSet.has(`${nx},${ny}`)) {
        count++;
      }
    }
  }

  return count;
}

export const STORAGE_KEY_PREFIX = "mine_positions_";

export interface MineData {
  minePositions: Array<{ x: number; y: number }>;
  nullifier: string;
  commitment: string;
}

export function saveMineData(
  minePositions: Array<{ x: number; y: number }>,
  nullifier: string,
  commitment: string,
): void {
  const data: MineData = { minePositions, nullifier, commitment };
  localStorage.setItem(`${STORAGE_KEY_PREFIX}`, JSON.stringify(data));
}

export function getMineData(): MineData {
  const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}`);
  if (!raw) {
    throw new Error(`Mine data not found`);
  }
  return JSON.parse(raw) as MineData;
}

export function isMine(x: number, y: number): boolean {
  const { minePositions } = getMineData();
  return minePositions.some((mine) => mine.x === x && mine.y === y);
}

function toMines(
  minePositions: { x: number; y: number }[],
): [string, string][] {
  return minePositions.map(({ x, y }) => [x.toString(), y.toString()]);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
