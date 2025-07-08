'use client';

import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { User, Search, Heart, Shield, Database, Users } from 'lucide-react';

export default function HomePage() {
  const { address } = useAccount();
  const router = useRouter();

  const handlePatientFlow = () => {
    router.push('/patient/profile');
  };

  const handleResearcherFlow = () => {
    router.push('/researcher/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenue sur Mon Cercle Santé
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Plateforme décentralisée pour la gestion sécurisée des données médicales 
            et la participation aux études de recherche sur le diabète.
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Patient Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Je suis un Patient</h3>
              <p className="text-gray-600 mb-8">
                Gérez vos données médicales, participez à des études de recherche 
                et gardez le contrôle total sur vos informations de santé.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-8 text-left">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Données sécurisées sur blockchain</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Upload et gestion de vos données</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Heart className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Participation aux études médicales</span>
                </div>
              </div>
              
              <Button 
                onClick={handlePatientFlow}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                Accéder à mon espace patient
              </Button>
            </div>
          </div>

          {/* Researcher Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Je suis un Chercheur</h3>
              <p className="text-gray-600 mb-8">
                Accédez aux données anonymisées des patients, créez des études 
                et contribuez à l'avancement de la recherche médicale.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-8 text-left">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Accès aux données anonymisées</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Search className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Création et gestion d'études</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Conformité RGPD garantie</span>
                </div>
              </div>
              
              <Button 
                onClick={handleResearcherFlow}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg"
              >
                Accéder à mon espace chercheur
              </Button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Comment ça marche ?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Connexion sécurisée</h4>
                <p className="text-gray-600 text-sm">
                  Connectez votre wallet pour une authentification décentralisée et sécurisée.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-blue-600">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Gestion des données</h4>
                <p className="text-gray-600 text-sm">
                  Patients: uploadez vos données. Chercheurs: accédez aux données anonymisées.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-blue-600">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Collaboration</h4>
                <p className="text-gray-600 text-sm">
                  Participez aux études de recherche tout en gardant le contrôle de vos données.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}