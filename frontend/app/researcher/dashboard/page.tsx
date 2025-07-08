'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Users, BarChart, Home } from 'lucide-react';
import ResearcherRegistration from '@/components/researcher/ResearcherRegistration';

interface Study {
  id: number;
  description: string;
  protocolUrl?: string;
  isApproved: boolean;
  createdAt: string;
}

interface ResearcherInfo {
  id: string;
  firstName: string;
  lastName: string;
  institution?: string;
  email?: string;
  walletAddress: string;
  createdAt: string;
  createdStudies?: Study[];
  collaborativeStudies?: Study[];
}

export default function ResearcherDashboard() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [researcherInfo, setResearcherInfo] = useState<ResearcherInfo | null>(null);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    checkResearcherInDatabase();
  }, [isConnected, address, router]);

  const checkResearcherInDatabase = async () => {
    if (!address) return;
    
    setIsCheckingDatabase(true);
    try {
      const response = await fetch(`/api/researcher/wallet?address=${address}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResearcherInfo(data.researcher);
        setNeedsRegistration(false);
      } else if (response.status === 404) {
        setNeedsRegistration(true);
      } else {
        console.error('Erreur lors de la vérification:', data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du chercheur:', error);
    } finally {
      setIsCheckingDatabase(false);
    }
  };

  const handleRegistrationSuccess = () => {
    setNeedsRegistration(false);
    checkResearcherInDatabase();
  };

  // Calculer les statistiques avec vérifications de sécurité
  const createdStudies = researcherInfo?.createdStudies || [];
  const collaborativeStudies = researcherInfo?.collaborativeStudies || [];
  
  const totalStudies = createdStudies.length + collaborativeStudies.length;
  const activeStudies = createdStudies.filter(study => study.isApproved).length + 
    collaborativeStudies.filter(study => study.isApproved).length;
  const createdStudiesCount = createdStudies.length;
  const collaborativeStudiesCount = collaborativeStudies.length;

  if (!isConnected) {
    return null;
  }

  if (isCheckingDatabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre profil chercheur...</p>
        </div>
      </div>
    );
  }

  if (needsRegistration) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">Espace Chercheur</h1>
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Accueil</span>
              </Button>
            </div>
          </div>
        </header>
        
        <main className="py-8">
          <ResearcherRegistration onRegistrationSuccess={handleRegistrationSuccess} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tableau de bord Chercheur</h1>
              {researcherInfo && (
                <p className="text-sm text-gray-600">
                  Bienvenue, {researcherInfo.firstName} {researcherInfo.lastName}
                  {researcherInfo.institution && ` - ${researcherInfo.institution}`}
                </p>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Profil du chercheur */}
      {researcherInfo && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Informations du profil</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Nom :</span> {researcherInfo.firstName} {researcherInfo.lastName}</p>
                  {researcherInfo.institution && (
                    <p><span className="font-medium">Institution :</span> {researcherInfo.institution}</p>
                  )}
                  {researcherInfo.email && (
                    <p><span className="font-medium">Email :</span> {researcherInfo.email}</p>
                  )}
                  <p><span className="font-medium">Wallet :</span> {researcherInfo.walletAddress}</p>
                  <p><span className="font-medium">Membre depuis :</span> {new Date(researcherInfo.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Résumé des activités</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{createdStudiesCount}</div>
                    <div className="text-gray-600">Études créées</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{collaborativeStudiesCount}</div>
                    <div className="text-gray-600">Collaborations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Studies Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-8 h-8 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Mes Études</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Créez et gérez vos études de recherche médicale.
            </p>
            <Button 
              onClick={() => router.push('/researcher/studies')}
              className="w-full"
            >
              Gérer mes études
            </Button>
          </div>

          {/* Data Access Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-8 h-8 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Accès aux Données</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Accédez aux données anonymisées des patients participants.
            </p>
            <Button 
              onClick={() => router.push('/researcher/data')}
              className="w-full"
              variant="outline"
            >
              Consulter les données
            </Button>
          </div>

          {/* Analytics Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <BarChart className="w-8 h-8 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Analyses</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Visualisez et analysez les données de vos études.
            </p>
            <Button 
              onClick={() => router.push('/researcher/analytics')}
              className="w-full"
              variant="outline"
            >
              Voir les analyses
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{activeStudies}</div>
            <div className="text-sm text-gray-600">Études actives</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalStudies}</div>
            <div className="text-sm text-gray-600">Total études</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{createdStudiesCount}</div>
            <div className="text-sm text-gray-600">Études créées</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{collaborativeStudiesCount}</div>
            <div className="text-sm text-gray-600">Collaborations</div>
          </div>
        </div>
      </main>
    </div>
  );
}