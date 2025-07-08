'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Settings, Home } from 'lucide-react';

export default function PatientDashboard() {
  const { address, isConnected } = useAccount();
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
            <h1 className="text-xl font-bold text-gray-900">Tableau de bord Patient</h1>
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
          {/* Upload Data Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Mes Données</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Uploadez et gérez vos données médicales en toute sécurité.
            </p>
            <Button 
              onClick={() => router.push('/patient/upload')}
              className="w-full"
            >
              Gérer mes données
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
              onClick={() => router.push('/patient/consents')}
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
              onClick={() => router.push('/patient/settings')}
              className="w-full"
              variant="outline"
            >
              Modifier mon profil
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activité Récente</h2>
            <div className="text-gray-600">
              <p>Aucune activité récente à afficher.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}