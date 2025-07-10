'use client';

import { useAccount, useReadContract } from 'wagmi';
import { tokenContractAddress, tokenContractABI } from '@/constants';
import { monthMintLimit } from '@/constants';

export function useCercleBalance() {
  const { address, isConnected } = useAccount();

  const { data: cercleBalance, isLoading: isLoadingBalance, error: balanceError, refetch } = useReadContract({
    address: tokenContractAddress as `0x${string}`,
    abi: tokenContractABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  const formatCercleBalance = (balance?: bigint) => {
    if (!balance) return '0';
    return balance.toString();
  };

  const balanceAsNumber = cercleBalance ? Number(cercleBalance) : 0;
  const progressPercentage = Math.min((balanceAsNumber / monthMintLimit) * 100, 100); // Limite mensuelle de 200

  return {
    balance: balanceAsNumber,
    formattedBalance: formatCercleBalance(cercleBalance as bigint),
    rawBalance: cercleBalance as bigint | undefined,
    isLoading: isLoadingBalance,
    error: balanceError,
    progressPercentage,
    monthlyLimit: 200,
    refetch,
    isConnected
  };
}