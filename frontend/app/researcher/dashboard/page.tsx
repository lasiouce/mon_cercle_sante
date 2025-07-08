'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Users, BarChart, Home } from 'lucide-react';

export default function ResearcherDashboard() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Tableau de bord Chercheur</h1>
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
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Études actives</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Participants</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Datasets</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">0</div>
            <div className="text-sm text-gray-600">Analyses</div>
          </div>
        </div>
      </main>
    </div>
  );
}