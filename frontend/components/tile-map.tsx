'use client';

import { TilePosition } from '@/hooks/use-board';

interface TileMapProps {
  width?: number;
  height?: number;
  minedTiles: TilePosition[];
  onTileClick: (x: number, y: number) => void;
  showMines?: boolean;
}

export function TileMap({ 
  width = 9, 
  height = 9, 
  minedTiles, 
  onTileClick, 
  showMines = true 
}: TileMapProps) {
  const tileSize = Math.min(100, Math.max(40, 360 / width));

  const hasMineAt = (x: number, y: number): boolean => {
    return minedTiles.some((tile) => tile.x === x && tile.y === y);
  };

  return (
    <div className="flex justify-center">
      <div 
        className="bg-gray-800 border-4 border-gray-900 rounded-lg overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gap: '2px',
          padding: '4px',
          backgroundColor: '#1f2937',
        }}
      >
        {Array.from({ length: height }).map((_, y) =>
          Array.from({ length: width }).map((_, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => onTileClick(x, y)}
              style={{
                width: `${tileSize}px`,
                height: `${tileSize}px`,
              }}
              className="relative bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-500 hover:from-gray-500 hover:to-gray-600 transition-all duration-75 flex items-center justify-center text-2xl font-bold cursor-pointer active:scale-95"
            >
              {showMines && hasMineAt(x, y) && (
                <span className="text-2xl">💣</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
