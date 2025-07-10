'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { consentContractAddress, consentContractABI } from '@/constants';
import { toast } from 'sonner';

interface RevokeConsentButtonProps {
  consentId: bigint;
  patientId: bigint;
  isActive: boolean;
  isExpired: boolean;
  onRevoked: () => void;
  className?: string;
}

export default function RevokeConsentButton({
  consentId,
  patientId,
  isActive,
  isExpired,
  onRevoked,
  className = ""
}: RevokeConsentButtonProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  
  // Hook pour la révocation
  const { writeContract, data: revokeHash, error: revokeError } = useWriteContract();
  
  // Attendre la confirmation de la transaction de révocation
  const { isLoading: isConfirming, isSuccess: isRevokeSuccess } = useWaitForTransactionReceipt({
    hash: revokeHash,
  });

  // Vérifier si le consentement peut être révoqué
  const canRevoke = isActive && !isExpired;

  const handleRevoke = async () => {
    if (!canRevoke) {
      toast.error('Ce consentement ne peut pas être révoqué');
      return;
    }

    setIsRevoking(true);
    
    try {
      writeContract({
        address: consentContractAddress as `0x${string}`,
        abi: consentContractABI,
        functionName: 'revokeConsent',
        args: [consentId, patientId],
      });
    } catch (err) {
      console.error('Erreur lors de la révocation:', err);
      toast.error('Erreur lors de la révocation du consentement');
      setIsRevoking(false);
    }
  };

  // Gérer le succès de la révocation
  useEffect(() => {
    if (isRevokeSuccess) {
      toast.success('Consentement révoqué avec succès!');
      setIsRevoking(false);
      onRevoked(); // Notifier le parent pour actualiser
    }
  }, [isRevokeSuccess, onRevoked]);

  // Gérer les erreurs de révocation
  useEffect(() => {
    if (revokeError) {
      toast.error('Erreur lors de la révocation du consentement');
      setIsRevoking(false);
    }
  }, [revokeError]);

  // Ne pas afficher le bouton si le consentement ne peut pas être révoqué
  if (!canRevoke) {
    return null;
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleRevoke}
        disabled={isRevoking || isConfirming}
        className={className}
      >
        {isRevoking || isConfirming ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
            Révocation...
          </>
        ) : (
          <>
            <Trash2 className="h-3 w-3 mr-1" />
            Révoquer
          </>
        )}
      </Button>
      
      {revokeHash && (
        <div className="mt-2 text-xs text-gray-500">
          Transaction: {revokeHash.slice(0, 10)}...{revokeHash.slice(-8)}
        </div>
      )}
    </>
  );
}