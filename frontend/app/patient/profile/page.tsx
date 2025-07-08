'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileForm from '@/components/patient/ProfileForm';
import PatientRegistration from '@/components/patient/PatientRegistration';
import { consentContractAddress, consentContractABI } from '@/constants';

export default function PatientProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [isPatientInDatabase, setIsPatientInDatabase] = useState<boolean | null>(null);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [step, setStep] = useState<'loading' | 'blockchain' | 'profile' | 'complete'>('loading');

  // Vérifier si le patient est déjà enregistré sur la blockchain
  const { data: isPatientRegistered, isLoading: isCheckingBlockchain } = useReadContract({
    address: consentContractAddress as `0x${string}`,
    abi: consentContractABI,
    functionName: 'isPatientRegistered',
    args: address ? [address] : undefined,
    account: address,
  });

  // Vérifier si le patient existe en base de données
  useEffect(() => {
    const checkPatientInDatabase = async () => {
      if (!address || isPatientRegistered === undefined) return;
      
      // Si pas enregistré sur blockchain, pas besoin de vérifier la DB
      if (!isPatientRegistered) {
        setIsPatientInDatabase(false);
        setStep('blockchain');
        return;
      }
      
      setIsCheckingDatabase(true);
      try {
        const response = await fetch(`/api/patient/wallet/${address}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setIsPatientInDatabase(true);
          setStep('complete');
        } else if (data.code === 'PATIENT_NOT_FOUND') {
          setIsPatientInDatabase(false);
          setStep('profile');
        } else {
          console.error('Erreur lors de la vérification:', data.error);
          setIsPatientInDatabase(false);
          setStep('profile');
        }
      } catch (error) {
        console.error('Erreur de connexion:', error);
        setIsPatientInDatabase(false);
        setStep('profile');
      } finally {
        setIsCheckingDatabase(false);
      }
    };

    checkPatientInDatabase();
  }, [address, isPatientRegistered]);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Rediriger vers le dashboard si tout est complet
  useEffect(() => {
    if (step === 'complete') {
      router.push('/patient/dashboard');
    }
  }, [step, router]);

  // Gérer le succès de l'enregistrement blockchain
  const handleBlockchainRegistrationSuccess = () => {
    setStep('profile');
  };

  // Gérer le succès de l'enregistrement du profil
  const handleProfileSuccess = () => {
    setStep('complete');
  };

  // Afficher un loader pendant les vérifications initiales
  if (isCheckingBlockchain || isCheckingDatabase || step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Vérification du profil...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            {step === 'blockchain' && (
              <>
                <h1 className="text-3xl font-bold text-gray-900">Enregistrement Blockchain</h1>
                <p className="text-gray-600 mt-2">
                  Première étape : Enregistrez-vous sur la blockchain
                </p>
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    📋 Étape 1/2 : Enregistrement blockchain
                  </p>
                </div>
              </>
            )}
            
            {step === 'profile' && (
              <>
                <h1 className="text-3xl font-bold text-gray-900">Profil Patient</h1>
                <p className="text-gray-600 mt-2">
                  Deuxième étape : Complétez votre profil médical
                </p>
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800">
                    ✅ Blockchain enregistrée • 📋 Étape 2/2 : Profil médical
                  </p>
                </div>
              </>
            )}
          </div>
          
          {step === 'blockchain' && (
            <PatientRegistration onRegistrationSuccess={handleBlockchainRegistrationSuccess} />
          )}
          
          {step === 'profile' && (
            <ProfileForm onSuccess={handleProfileSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}