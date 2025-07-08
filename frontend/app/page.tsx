'use client';
import NotConnected from "@/components/shared/NotConnected";

import { useAccount } from "wagmi";
import HomePage from "@/components/shared/HomePage";

export default function Home() {

  const { isConnected } = useAccount();

  if (!isConnected) {
    return <NotConnected />;
  }

  return <HomePage />;
}