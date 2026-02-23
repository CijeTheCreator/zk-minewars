"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { setAllowed } from "@stellar/freighter-api";
import {
  isConnected,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

interface ConnectWalletScreenProps {
  onConnectWallet: () => void;
}

export function ConnectWalletScreen({
  onConnectWallet,
}: ConnectWalletScreenProps) {
  const [connectPressed, setConnectPressed] = useState(false);

  const checkIsConnected = async () => {
    const connected = await isConnected();
    if (connected) {
      onConnectWallet?.();
    }
  };

  const handleConnectClick = async () => {
    setConnectPressed(true);
    await setAllowed();
    setConnectPressed(false);
    onConnectWallet?.();
    await checkIsConnected();
  };

  useEffect(() => {
    checkIsConnected();
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Connect Wallet Background"
        fill
        className="object-cover"
        priority
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {/* Title */}
        <h1
          className="text-5xl md:text-7xl font-bold text-white text-center mb-8 drop-shadow-lg"
          style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.5)" }}
        >
          STELLAR
        </h1>
        <h2
          className="text-4xl md:text-6xl font-bold text-white text-center mb-16 drop-shadow-lg"
          style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.5)" }}
        >
          MINEWARS
        </h2>

        {/* Subtitle */}
        <p
          className="text-xl md:text-2xl text-white text-center mb-12 max-w-2xl px-4 drop-shadow-lg"
          style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.5)" }}
        >
          Connect your wallet to begin playing
        </p>

        {/* Connect Wallet button */}
        <button
          onClick={handleConnectClick}
          className={`transition-transform duration-150 ${
            connectPressed ? "scale-95" : "scale-100 hover:scale-105"
          }`}
        >
          <Image
            src="/game-assets/start-game-button.svg"
            alt="Connect Wallet"
            width={240}
            height={80}
            className="w-48 h-auto md:w-64 md:h-auto"
          />
        </button>
      </div>
    </div>
  );
}
