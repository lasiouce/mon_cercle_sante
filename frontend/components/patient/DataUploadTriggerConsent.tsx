'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { consentContractABI, consentContractAddress } from '@/constants';

interface DataUploadTriggerConsentProps {
  studyId: bigint;
  datasetHash: string;
  patientId: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export default function DataUploadTriggerConsent({
  studyId,
  datasetHash,
  patientId,
  onSuccess,
  onError,
  onClose
}: DataUploadTriggerConsentProps) {
  const { address } = useAccount();
  const [validityDuration, setValidityDuration] = useState<number>(365);
  
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error: writeError 
  } = useWriteContract();
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash 
  });

  // Gérer les états de la transaction avec useEffect
  useEffect(() => {
    if (hash && isConfirming) {
      toast.loading('Confirmation de la transaction en cours...');
    }
  }, [hash, isConfirming]);

  useEffect(() => {
    if (isConfirmed) {
      toast.success('Consentement accordé avec succès !');
      onSuccess?.();
    }
  }, [isConfirmed, onSuccess]);

  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
      onError?.(errorMessage);
    }
  }, [writeError, confirmError, onError]);

  const handleGrantConsent = async () => {
    if (!address) {
      toast.error('Veuillez connecter votre wallet');
      return;
    }

    try {
      writeContract({
        address: consentContractAddress,
        abi: consentContractABI,
        functionName: 'selfGrantConsent',
        args: [datasetHash as `0x${string}`, studyId, BigInt(validityDuration * 24 * 60 * 60)]
      });
      
      toast.info('Transaction envoyée...');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la transaction:', error);
      toast.error('Erreur lors de l\'envoi de la transaction');
      onError?.(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Données uploadées avec succès
            </CardTitle>
            <CardDescription>
              Accordez votre consentement pour participer à l&apos;étude
            </CardDescription>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <p><strong>Hash du dataset:</strong> <code className="text-sm">{datasetHash}</code></p>
          <p><strong>ID de l&apos;étude:</strong> {studyId.toString()}</p>
          <p><strong>Patient ID:</strong> {patientId}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="validity">Durée de validité du consentement (jours)</Label>
          <Input
            id="validity"
            type="number"
            min="1"
            max="3650"
            value={validityDuration}
            onChange={(e) => setValidityDuration(Number(e.target.value))}
            placeholder="365"
          />
        </div>

        {hash && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Transaction hash: <code className="text-sm">{hash}</code>
            </AlertDescription>
          </Alert>
        )}

        {isConfirmed && (
          <>
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Consentement accordé avec succès ! Votre participation à l&apos;étude est maintenant active.
              </AlertDescription>
            </Alert>
            
            {onClose && (
              <Button 
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                Fermer
              </Button>
            )}
          </>
        )}

        {!isConfirmed && (
          <div className="flex gap-2">
            <Button 
              onClick={handleGrantConsent}
              disabled={isPending || isConfirming}
              className="flex-1"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPending ? 'Envoi en cours...' : 'Confirmation...'}
                </>
              ) : (
                'Accorder le consentement'
              )}
            </Button>
            
            {onClose && (
              <Button 
                onClick={onClose}
                variant="outline"
              >
                Annuler
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}