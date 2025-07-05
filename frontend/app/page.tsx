'use client';
import NotConnected from "@/components/shared/NotConnected";
import Cercle from "@/components/shared/Cercle";

import { useAccount } from "wagmi";

export default function Home() {

  const { isConnected } = useAccount();

  if (!isConnected) {
    return <NotConnected />;
  }

  return <Cercle />;
}