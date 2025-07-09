import { useAccount, useWriteContract, useWaitForTransactionReceipt, BaseError } from 'wagmi';
import { consentContractABI, consentContractAddress } from '@/constants';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

interface AuthorizeStudyOnContractProps {
  studyId: string;
  studyName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function AuthorizeStudyOnContract({ 
  studyId, 
  studyName, 
  onSuccess, 
  onError 
}: AuthorizeStudyOnContractProps) {
  const { address } = useAccount();
  const { data: hash, error, writeContract, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess, error: errorConfirmation } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleAuthorizeStudy = () => {
    if (!address) {
      toast.error('Veuillez connecter votre wallet');
      return;
    }

    try {
      // Convertir studyId string en bigint pour uint256
      const studyIdBigInt = BigInt(studyId);
      
      writeContract({
        address: consentContractAddress,
        abi: consentContractABI,
        functionName: 'authorizeStudy',
        args: [studyIdBigInt, studyName],
        account: address
      });
    } catch (err) {
      toast.error(`Erreur lors de la préparation de la transaction: ${err}`);
      onError?.('Erreur lors de la préparation de la transaction');
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success('Étude autorisée sur la blockchain avec succès!');
      onSuccess?.();
    }
    if (errorConfirmation) {
      const errorMsg = 'Échec de la confirmation de la transaction';
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  }, [isSuccess, errorConfirmation, onSuccess, onError]);

  useEffect(() => {
    if (error) {
      const errorMsg = (error as BaseError).shortMessage || error.message;
      toast.error(`Erreur de transaction: ${errorMsg}`);
      onError?.(errorMsg);
    }
  }, [error, onError]);

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleAuthorizeStudy}
        disabled={isPending || isConfirming || !address}
        className="w-full"
      >
        {isPending || isConfirming ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>
              {isPending ? 'Préparation...' : 'Confirmation...'}
            </span>
          </div>
        ) : (
          'Autoriser l\'étude sur la blockchain'
        )}
      </Button>

      {/* Affichage du hash de la transaction */}
      {hash && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircleIcon className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Transaction soumise</AlertTitle>
          <AlertDescription className="text-blue-700">
            Hash: <code className="text-xs">{hash}</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Indication que la transaction est en cours de confirmation */}
      {isConfirming && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircleIcon className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Confirmation en cours</AlertTitle>
          <AlertDescription className="text-amber-700">
            Veuillez patienter pendant la confirmation de la transaction...
          </AlertDescription>
        </Alert>
      )}

      {/* Notification de succès */}
      {isSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <AlertCircleIcon className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Succès</AlertTitle>
          <AlertDescription className="text-green-700">
            L&apos;étude a été autorisée sur la blockchain avec succès.
          </AlertDescription>
        </Alert>
      )}

      {/* Affichage des erreurs */}
      {(error || errorConfirmation) && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircleIcon className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Erreur</AlertTitle>
          <AlertDescription className="text-red-700">
            {error && (error as BaseError).shortMessage || error?.message}
            {errorConfirmation && (errorConfirmation as BaseError).shortMessage || errorConfirmation?.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}