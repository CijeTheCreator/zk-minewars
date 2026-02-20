import { useState } from 'react';

export interface TilePosition {
  x: number;
  y: number;
}

const BOARD_SIZE = 9;

export function useBoard() {
  const [minedTiles, setMinedTiles] = useState<TilePosition[]>([]);

  const toggleTileMine = (x: number, y: number, maxMines: number) => {
    setMinedTiles((prevMines) => {
      // Check if tile already has a mine
      const tileIndex = prevMines.findIndex((tile) => tile.x === x && tile.y === y);

      if (tileIndex > -1) {
        // Remove mine
        return prevMines.filter((_, index) => index !== tileIndex);
      }

      // Add mine only if we haven't reached max
      if (prevMines.length < maxMines) {
        return [...prevMines, { x, y }];
      }

      return prevMines;
    });
  };

  const hasMineAt = (x: number, y: number): boolean => {
    return minedTiles.some((tile) => tile.x === x && tile.y === y);
  };

  const getMineCount = (): number => {
    return minedTiles.length;
  };

  const getMinedTiles = (): TilePosition[] => {
    return minedTiles;
  };

  return {
    minedTiles,
    toggleTileMine,
    hasMineAt,
    getMineCount,
    getMinedTiles,
    boardSize: BOARD_SIZE,
  };
}
