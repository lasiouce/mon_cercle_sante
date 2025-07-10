'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { consentContractAddress, consentContractABI } from '@/constants';
import { publicClient } from '@/lib/viemClients';

export interface PatientData {
  patientId: string;
  birthYear?: number;
  weightKg?: number;
  sex?: string;
  diabeteType?: string;
  consentId: string;
  studyId: string;
  datasetHash: string;
  validUntil: bigint;
  createdAt: bigint;
  isActive: boolean;
  measurements: Measurement[];
}

export interface Measurement {
  id: number;
  measurementType: string;
  value: number;
  timestamp: string;
  mealContext?: string;
  labName?: string;
  deviceModel?: string;
}

export interface ResearcherInfo {
  id: string;
  firstName: string;
  lastName: string;
  institution?: string;
  email?: string;
  walletAddress: string;
}

export interface Study {
  id: number;
  description: string;
  protocolUrl?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Consent {
  consentId: string;
  patientId: string;
  studyId: number;
  datasetHash: string;
  validUntil: bigint;
  createdAt: bigint;
  isActive: boolean;
  revokedAt?: bigint;
}

export function useResearcherData() {
  const { address } = useAccount();
  const [researcherInfo, setResearcherInfo] = useState<ResearcherInfo | null>(null);
  const [patientData, setPatientData] = useState<PatientData[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkResearcherInDatabase = useCallback(async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/researcher/wallet?address=${address}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResearcherInfo(data.researcher);
        await fetchResearcherStudies(data.researcher.id);
      } else {
        setError('Chercheur non trouvé dans la base de données');
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du chercheur:', err);
      setError('Erreur lors de la vérification du chercheur');
    }
  }, [address]);

  const fetchResearcherStudies = async (researcherId: string) => {
    try {
      const response = await fetch(`/api/researcher/studies?researcherId=${researcherId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStudies(data.studies);
        await fetchConsentedPatientData(data.studies);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des études:', err);
      setError('Erreur lors de la récupération des études');
    }
  };

  const fetchConsentedPatientData = async (researcherStudies: Study[]) => {
    try {
      setIsLoading(true);
      const allPatientData: PatientData[] = [];

      for (const study of researcherStudies) {
        const consents = await fetchConsentsForStudy(study.id);
        
        for (const consent of consents) {
          const patientResponse = await fetch(`/api/patient/data?patientId=${consent.patientId}&datasetHash=${consent.datasetHash}`);
          
          if (patientResponse.ok) {
            const patientData = await patientResponse.json();
            
            allPatientData.push({
              patientId: consent.patientId,
              birthYear: patientData.birthYear,
              weightKg: patientData.weightKg,
              sex: patientData.sex,
              diabeteType: patientData.diabeteType,
              consentId: consent.consentId,
              studyId: study.id.toString(),
              datasetHash: consent.datasetHash,
              validUntil: consent.validUntil,
              createdAt: consent.createdAt,
              isActive: consent.isActive,
              measurements: patientData.measurements || []
            });
          }
        }
      }

      setPatientData(allPatientData);
    } catch (err) {
      console.error('Erreur lors de la récupération des données des patients:', err);
      setError('Erreur lors de la récupération des données des patients');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConsentsForStudy = async (studyId: number): Promise<Consent[]> => {
    try {
      
      const consentDetails = await publicClient.readContract({
        address: consentContractAddress as `0x${string}`,
        abi: consentContractABI,
        functionName: 'getConsentsByStudy',
        args: [BigInt(studyId)],
        account: address
      });

      const consents: Consent[] = consentDetails.map((consent: any) => {
        // Pour obtenir le patientId, nous devons faire un appel supplémentaire
        // car getConsentsByStudy ne retourne pas directement le patientId
        // Nous utiliserons l'owner du token NFT pour obtenir le patientId
        return {
          consentId: consent.consentId.toString(),
          patientId: '', // Sera rempli dans une étape suivante
          studyId: Number(consent.studyId),
          datasetHash: consent.datasetHash,
          validUntil: consent.validUntil,
          createdAt: consent.createdAt,
          isActive: consent.isActive,
          revokedAt: consent.revokedAt > 0 ? consent.revokedAt : undefined
        };
      });

      // Pour chaque consentement, récupérer le patientId en utilisant l'owner du NFT
      const consentsWithPatientIds = await Promise.all(
        consents.map(async (consent) => {
          try {
            // Obtenir l'owner du token NFT
            const owner = await publicClient.readContract({
              address: consentContractAddress as `0x${string}`,
              abi: consentContractABI,
              functionName: 'ownerOf',
              args: [BigInt(consent.consentId)],
              account:address
            });

            // Obtenir le patientId à partir de l'adresse du propriétaire
            const patientId = await publicClient.readContract({
              address: consentContractAddress as `0x${string}`,
              abi: consentContractABI,
              functionName: 'getPatientId',
              args: [owner],
              account:address
            });

            return {
              ...consent,
              patientId: patientId.toString()
            };
          } catch (error) {
            console.error(`Erreur lors de la récupération du patientId pour le consentement ${consent.consentId}:`, error);
            return {
              ...consent,
              patientId: '0'
            };
          }
        })
      );

      return consentsWithPatientIds;
    } catch (error) {
      console.error('Erreur lors de la récupération des consentements pour l\'étude:', error);
      return [];
    }
  };

  useEffect(() => {
    if (address) {
      checkResearcherInDatabase();
    }
  }, [address, checkResearcherInDatabase]);

  return {
    researcherInfo,
    patientData,
    studies,
    isLoading,
    error,
    refetch: checkResearcherInDatabase
  };
}