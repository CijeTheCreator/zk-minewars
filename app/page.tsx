'use client';

import { useState } from 'react';
import { MenuScreen } from '@/components/menu-screen';
import { GameConfigScreen, type GameConfig } from '@/components/game-config-screen';
import { WaitingScreen } from '@/components/waiting-screen';
import { JoinGameScreen } from '@/components/join-game-screen';
import { CommitScreen } from '@/components/commit-screen';
import { GameBoard } from '@/components/game-board';

type Screen = 'menu' | 'game-config' | 'waiting' | 'join-game' | 'commit' | 'game-board';

interface GameBoardData {
  playerMines: Array<{ x: number; y: number }>;
  opponentMines: Array<{ x: number; y: number }>;
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [gameBoardData, setGameBoardData] = useState<GameBoardData | null>(null);

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleStartGame = () => {
    setCurrentScreen('game-config');
  };

  const handleJoinGameClick = () => {
    setCurrentScreen('join-game');
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  const handleGameConfigSubmit = (config: GameConfig) => {
    setGameConfig(config);
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setCurrentScreen('waiting');
  };

  const handleWaitingCancel = () => {
    setCurrentScreen('menu');
  };

  const handleJoinGame = (id: string) => {
    console.log('Joining game with session ID:', id);
    setCurrentScreen('commit');
  };

  const handleCommitScreenBack = () => {
    setCurrentScreen('join-game');
  };

  const handleCommitSubmit = (minePositions: Array<{ x: number; y: number }>) => {
    console.log('Mines committed:', minePositions);
    // For now, generate mock opponent mines and move to game board
    const mockOpponentMines = generateMockMines();
    setGameBoardData({
      playerMines: minePositions,
      opponentMines: mockOpponentMines,
    });
    setCurrentScreen('game-board');
  };

  const generateMockMines = () => {
    // Generate 5 random mine positions for the opponent
    const mines = [];
    while (mines.length < 5) {
      const x = Math.floor(Math.random() * 9);
      const y = Math.floor(Math.random() * 9);
      if (!mines.some((m) => m.x === x && m.y === y)) {
        mines.push({ x, y });
      }
    }
    return mines;
  };

  const handleGameEnd = (winner: 'player1' | 'player2') => {
    console.log('Game ended. Winner:', winner);
    // TODO: Show end game screen
    setCurrentScreen('menu');
  };

  return (
    <>
      {currentScreen === 'menu' && (
        <MenuScreen 
          onStartGame={handleStartGame}
          onJoinGame={handleJoinGameClick}
        />
      )}
      {currentScreen === 'game-config' && (
        <GameConfigScreen 
          onBack={handleBackToMenu}
          onSubmit={handleGameConfigSubmit}
        />
      )}
      {currentScreen === 'waiting' && (
        <WaitingScreen 
          sessionId={sessionId}
          onCancel={handleWaitingCancel}
        />
      )}
      {currentScreen === 'join-game' && (
        <JoinGameScreen 
          onBack={handleBackToMenu}
          onJoin={handleJoinGame}
        />
      )}
      {currentScreen === 'commit' && (
        <CommitScreen 
          onBack={handleCommitScreenBack}
          onCommit={handleCommitSubmit}
        />
      )}
      {currentScreen === 'game-board' && gameBoardData && (
        <GameBoard 
          playerMines={gameBoardData.playerMines}
          opponentMines={gameBoardData.opponentMines}
          onGameEnd={handleGameEnd}
        />
      )}
    </>
  );
}
