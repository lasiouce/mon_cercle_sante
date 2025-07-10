'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { consentContractABI, consentContractAddress } from '@/constants';

export interface ConsentData {
  consentId: string;
  datasetHash: string;
  studyId: string;
  validUntil: bigint;
  createdAt: bigint;
  revokedAt: bigint;
  isActive: boolean;
}

export interface UsePatientConsentsReturn {
  consents: ConsentData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePatientConsents(patientId?: bigint): UsePatientConsentsReturn {
  const { address, isConnected } = useAccount();
  const [consents, setConsents] = useState<ConsentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les IDs de consentements
  const { 
    data: consentIds, 
    error: consentIdsError,
    refetch: refetchConsentIds 
  } = useReadContract({
    address: consentContractAddress,
    abi: consentContractABI,
    functionName: 'getPatientConsents',
    args: patientId ? [patientId] : undefined,
    query: {
      enabled: !!patientId && !!address && isConnected
    }
  });

  const fetchConsentDetails = useCallback(async () => {
    if (!patientId || !consentIds || !Array.isArray(consentIds) || consentIds.length === 0) {
      setConsents([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const { publicClient } = await import('@/lib/viemClients');
      
      const consentPromises = (consentIds as bigint[]).map(async (consentId) => {
        try {
          const details = await publicClient.readContract({
            address: consentContractAddress,
            abi: consentContractABI,
            functionName: 'getConsentDetails',
            args: [consentId, patientId]
          });
          
          return {
            consentId: details.consentId.toString(),
            datasetHash: details.datasetHash,
            studyId: details.studyId.toString(),
            validUntil: details.validUntil,
            createdAt: details.createdAt,
            revokedAt: details.revokedAt,
            isActive: details.isActive,
          } as ConsentData;
        } catch (err) {
          console.error(`Erreur récupération consentement ${consentId}:`, err);
          return null;
        }
      });
      
      const results = await Promise.all(consentPromises);
      const validConsents = results.filter((consent): consent is ConsentData => consent !== null);
      
      setConsents(validConsents);
    } catch (err) {
      console.error('Erreur lors de la récupération des consentements:', err);
      setError('Impossible de charger les consentements');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, consentIds]);

  // Effet pour charger les détails quand les IDs changent
  useEffect(() => {
    if (consentIdsError) {
      setError('Erreur lors de la récupération des IDs de consentements');
      setIsLoading(false);
      return;
    }
    
    fetchConsentDetails();
  }, [fetchConsentDetails, consentIdsError]);

  const refetch = useCallback(() => {
    refetchConsentIds();
    fetchConsentDetails();
  }, [refetchConsentIds, fetchConsentDetails]);

  return {
    consents,
    isLoading,
    error,
    refetch
  };
}