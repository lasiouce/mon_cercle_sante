'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ProfileForm from '@/components/patient/ProfileForm';
import { consentContractAddress, consentContractABI } from '@/constants';

export default function PatientProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Vérifier si le patient est déjà enregistré
  const { data: isPatientRegistered } = useReadContract({
    address: consentContractAddress as `0x${string}`,
    abi: consentContractABI,
    functionName: 'isPatientRegistered',
    args: [address],
    query:{
        enabled: !!address
    }
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  useEffect(() => {
    if (isPatientRegistered) {
      router.push('/patient/dashboard');
    }
  }, [isPatientRegistered, router]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Enregistrement Patient</h1>
            <p className="text-gray-600 mt-2">
              Créez votre profil pour commencer à utiliser Mon Cercle Santé
            </p>
          </div>
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}