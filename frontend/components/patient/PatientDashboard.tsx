'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Settings, User, Calendar, Weight, Mail, Coins } from 'lucide-react';
import { useCercleBalance } from '@/hooks/useCercleBalance';

interface PatientInfo {
  id: number;
  walletAddress: string;
  firstName: string;
  lastName: string;
  email?: string;
  birthYear?: number;
  weightKg?: number;
  sex?: string;
  diabeteType?: string;
  createdAt: string;
  datasetReferences: [];
}

export default function PatientDashboard() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    balance, 
    isLoading: isLoadingBalance, 
    error: balanceError, 
    progressPercentage,
    monthlyLimit 
  } = useCercleBalance();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (!address) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/patient/wallet/${address}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setPatientInfo(data.patient);
        } else {
          setError(data.error || 'Erreur lors du chargement des informations');
        }
      } catch (err) {
        setError('Erreur de connexion');
        console.error('Erreur lors de la récupération des informations patient:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (address && isConnected) {
      fetchPatientInfo();
    }
  }, [address, isConnected]);

  const formatDiabeteType = (type?: string) => {
    if (!type) return 'Non spécifié';
    return type === 'TYPE_1' ? 'Type 1' : type === 'TYPE_2' ? 'Type 2' : type;
  };

  const formatSex = (sex?: string) => {
    if (!sex) return 'Non spécifié';
    return sex === 'M' ? 'Masculin' : sex === 'F' ? 'Féminin' : sex;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isConnected && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 rounded-full p-3">
                    <Coins className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Mon solde de CERCLE</h2>
                    <p className="text-blue-100">Points de fidélité gagnés</p>
                  </div>
                </div>
                <div className="text-right">
                  {isLoadingBalance ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Chargement...</span>
                    </div>
                  ) : balanceError ? (
                    <div className="text-red-200">
                      <p className="text-sm">Erreur de chargement</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-4xl font-bold">{balance.toLocaleString()}</p>
                      <p className="text-blue-100">CERCLE</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Barre de progression vers la limite mensuelle */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-blue-100 mb-1">
                  <span>Limite mensuelle</span>
                  <span>{balance}/{monthlyLimit} CERCLE</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Info Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Mes Informations</h2>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
                <p className="text-sm text-red-600 mt-1">
                  Vous devez d&apos;abord vous enregistrer comme patient.
                </p>
                <Button 
                  onClick={() => router.push('/patient/profile')}
                  className="mt-3"
                  size="sm"
                >
                  S&apos;enregistrer
                </Button>
              </div>
            ) : patientInfo ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Nom complet</p>
                      <p className="font-medium">{patientInfo.firstName} {patientInfo.lastName}</p>
                    </div>
                  </div>
                  
                  {patientInfo.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{patientInfo.email}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {patientInfo.birthYear && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Année de naissance</p>
                        <p className="font-medium">{patientInfo.birthYear}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">♂♀</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sexe</p>
                      <p className="font-medium">{formatSex(patientInfo.sex)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {patientInfo.weightKg && (
                    <div className="flex items-center space-x-3">
                      <Weight className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Poids</p>
                        <p className="font-medium">{patientInfo.weightKg} kg</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">🩺</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type de diabète</p>
                      <p className="font-medium">{formatDiabeteType(patientInfo.diabeteType)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Upload Data Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Mes Données</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Charger vos données médicales en toute sécurité.
            </p>
            <Button 
              onClick={() => router.push('/patient/upload')}
              className="w-full"
            >
              Charger
            </Button>
          </div>

          {/* Consents Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-8 h-8 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Mes Consentements</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Consultez et gérez vos consentements pour les études de recherche.
            </p>
            <Button 
              onClick={() => router.push('/patient/consent')}
              className="w-full"
              variant="outline"
            >
              Voir mes consentements
            </Button>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="w-8 h-8 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Mon Profil</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Modifiez vos informations personnelles et préférences.
            </p>
            <Button 
              onClick={() => router.push('/patient/edit-profile')}
              className="w-full"
              variant="outline"
            >
              Modifier mon profil
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {patientInfo && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Solde CERCLE</span>
                  <span className="font-medium text-blue-600">{balance} CERCLE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Datasets partagés</span>
                  <span className="font-medium">{patientInfo.datasetReferences.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Membre depuis</span>
                  <span className="font-medium">
                    {new Date(patientInfo.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Patient</span>
                  <span className="font-medium">#{patientInfo.id}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresse Wallet</h3>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm font-mono text-gray-700 break-all">
                  {patientInfo.walletAddress}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activité Récente</h2>
            <div className="text-gray-600">
              {patientInfo?.datasetReferences.length ? (
                <div className="space-y-2">
                  <p>Vous avez partagé {patientInfo.datasetReferences.length} dataset(s) pour la recherche.</p>
                </div>
              ) : (
                <p>Aucune activité récente à afficher.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}