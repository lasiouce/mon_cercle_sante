'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { consentContractABI, consentContractAddress } from '@/constants';

interface ConsentData {
  consentId: string;
  datasetHash: string;
  studyId: string;
  validUntil: bigint;
  createdAt: bigint;
  revokedAt: bigint;
  isActive: boolean;
}

interface ConsentDataFetcherProps {
  patientId: bigint | undefined;
  onConsentsLoaded: (consents: ConsentData[]) => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

export default function ConsentDataFetcher({ 
  patientId, 
  onConsentsLoaded, 
  onError, 
  onLoadingChange 
}: ConsentDataFetcherProps) {
  const { address } = useAccount();
  const [consentIds, setConsentIds] = useState<bigint[]>([]);

  // Récupérer le nombre de consentements
   useReadContract({
    address: consentContractAddress,
    abi: consentContractABI,
    functionName: 'getPatientConsentCount',
    args: patientId ? [patientId] : undefined,
    query: {
      enabled: !!patientId && !!address
    }
  });

  // Récupérer les IDs de consentements
  const { data: fetchedConsentIds } = useReadContract({
    address: consentContractAddress,
    abi: consentContractABI,
    functionName: 'getPatientConsents',
    args: patientId ? [patientId] : undefined,
    query: {
      enabled: !!patientId && !!address
    }
  });

  useEffect(() => {
    if (fetchedConsentIds) {
      setConsentIds(fetchedConsentIds as bigint[]);
    }
  }, [fetchedConsentIds]);

  useEffect(() => {
    if (!patientId || !consentIds.length || !address) {
      onConsentsLoaded([]);
      return;
    }

    const fetchConsentDetails = async () => {
      try {
        onLoadingChange(true);
        
        const { publicClient } = await import('@/lib/viemClients');
        
        const consentsWithDetails = await Promise.all(
          consentIds.map(async (consentId: bigint) => {
            try {
              const consentDetails = await publicClient.readContract({
                address: consentContractAddress,
                abi: consentContractABI,
                functionName: 'getConsentDetails',
                args: [consentId, patientId]
              });
              
              return {
                consentId: consentDetails.consentId.toString(),
                datasetHash: consentDetails.datasetHash,
                studyId: consentDetails.studyId.toString(),
                validUntil: consentDetails.validUntil,
                createdAt: consentDetails.createdAt,
                revokedAt: consentDetails.revokedAt,
                isActive: consentDetails.isActive,
              };
            } catch (error) {
              console.error(`Erreur lors de la récupération du consentement ${consentId}:`, error);
              return null;
            }
          })
        );
        
        const validConsents = consentsWithDetails.filter(consent => consent !== null) as ConsentData[];
        onConsentsLoaded(validConsents);
      } catch (error) {
        console.error('Erreur lors de la récupération des consentements:', error);
        onError('Erreur lors du chargement des consentements');
        onLoadingChange(false);
      } finally {
        onLoadingChange(false);
      }
    };

    fetchConsentDetails();
  }, [patientId, consentIds, address, onConsentsLoaded, onError, onLoadingChange]);

  return null;
}