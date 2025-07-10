'use client';

import { useAccount, useReadContract } from 'wagmi';
import { consentContractAddress, consentContractABI } from '@/constants';

export function usePatientId() {
  const { address, isConnected } = useAccount();

  // Vérifier si le patient est enregistré
  const { data: isPatientRegistered, isLoading: isCheckingRegistration } = useReadContract({
    address: consentContractAddress as `0x${string}`,
    abi: consentContractABI,
    functionName: 'isPatientRegistered',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Récupérer l'ID patient depuis la blockchain
  const { 
    data: patientId, 
    isLoading: isLoadingPatientId, 
    error 
  } = useReadContract({
    address: consentContractAddress as `0x${string}`,
    abi: consentContractABI,
    functionName: 'getPatientId',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && isPatientRegistered,
    },
  });

  const isLoading = isCheckingRegistration || isLoadingPatientId;
  const finalError = error ? 'Erreur lors de la récupération du patientId' : 
                    (isConnected && !isPatientRegistered) ? 'Patient non enregistré. Veuillez vous enregistrer d\'abord.' : null;

  return { 
    patientId: patientId ? BigInt(patientId.toString()) : undefined, 
    isLoading, 
    error: finalError,
    isRegistered: isPatientRegistered 
  };
}