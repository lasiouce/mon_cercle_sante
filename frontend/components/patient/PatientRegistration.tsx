'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Button } from '@/components/ui/button';
import { consentContractAddress, consentContractABI } from '@/constants';
import { toast } from 'sonner';

interface PatientRegistrationProps {
  onRegistrationSuccess: (patientId: number) => void;
}

export default function PatientRegistration({ onRegistrationSuccess }: PatientRegistrationProps) {
  const { address } = useAccount();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Vérifier si le patient est déjà enregistré
  const { data: isPatientRegistered, isLoading: isCheckingRegistration, refetch: refetchRegistrationStatus } = useReadContract({
    address: consentContractAddress as `0x${string}`,
    abi: consentContractABI,
    functionName: 'isPatientRegistered',
    args: address ? [address] : undefined,
  });

  // Hook pour récupérer l'ID patient
  const { data: patientId, refetch: refetchPatientId } = useReadContract({
    address: consentContractAddress as `0x${string}`,
    abi: consentContractABI,
    functionName: 'getPatientId',
    args: address ? [address] : undefined,
    account: address,
    query: {
      enabled: false,
    },
  });

  // Hook pour l'enregistrement
  const { writeContract, data: hash, error } = useWriteContract();
  
  // Attendre la confirmation de la transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Vérifier si le patient est déjà enregistré au chargement
  useEffect(() => {
    if (isPatientRegistered && patientId) {
      // Si déjà enregistré, récupérer l'ID et notifier le parent
      refetchPatientId().then((result) => {
        if (result.data) {
          const blockchainPatientId = Number(result.data);
          onRegistrationSuccess(blockchainPatientId);
        }
      });
    } 
  }, [isPatientRegistered, patientId, refetchPatientId, onRegistrationSuccess]);

  // Gérer le succès de la transaction d'enregistrement
  useEffect(() => {
    if (isSuccess) {
          refetchPatientId().then((result) => {
          if (result.data) {
            const blockchainPatientId = Number(result.data);
            toast.success(`Enregistrement réussi! ID Patient: ${blockchainPatientId}`);
            onRegistrationSuccess(blockchainPatientId);
          }
        });
        ;
      setIsRegistering(false);
    }
  }, [isSuccess, refetchPatientId, onRegistrationSuccess]);

  // Gérer les erreurs
  useEffect(() => {
    if (error) {
      toast.error('Erreur lors de l\'enregistrement sur la blockchain');
      setIsRegistering(false);
    }
  }, [error]);

  const handleRegister = async () => {
    if (!address) {
      toast.error('Veuillez connecter votre wallet');
      return;
    }

    setIsRegistering(true);
    
    try {
      writeContract({
        address: consentContractAddress as `0x${string}`,
        abi: consentContractABI,
        functionName: 'registerPatient',
        
      });
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      toast.error('Erreur lors de l\'enregistrement sur la blockchain');
      setIsRegistering(false);
    }
  };

  // Affichage pendant la vérification
  if (isCheckingRegistration) {
    return (
      <div className="text-center space-y-4">
        <div className="text-blue-600 font-medium">
          🔄 Vérification de l'état d'enregistrement...
        </div>
      </div>
    );
  }

  // Si déjà enregistré, afficher un message de confirmation
  if (isPatientRegistered) {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 font-medium">
          ✅ Vous êtes déjà enregistré sur la blockchain
        </div>
        <div className="text-sm text-gray-600">
          Récupération de votre ID patient...
        </div>
      </div>
    );
  }

  // Formulaire d'enregistrement
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Enregistrement Blockchain</h3>
        <p className="text-sm text-gray-600 mb-4">
          Créez votre profil pour commencer à utiliser Mon Cercle Santé
        </p>
      </div>
      
      <div className="text-sm text-gray-600">
        Étape 1: Enregistrement sur la blockchain
      </div>
      
      <Button 
        onClick={handleRegister}
        disabled={isRegistering || isConfirming}
        className="w-full"
      >
        {isRegistering || isConfirming 
          ? 'Enregistrement en cours...' 
          : 'S\'enregistrer sur la blockchain'
        }
      </Button>
      
      {hash && (
        <div className="text-xs text-gray-500 text-center">
          Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
        </div>
      )}
      
      <div className="text-xs text-gray-500 text-center">
        Adresse wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
    </div>
  );
}