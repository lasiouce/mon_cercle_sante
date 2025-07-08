'use client';

import { useAccount } from 'wagmi';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  // Fonction pour déterminer le module actuel
  const getCurrentModule = () => {
    if (pathname.includes('/consent')) return 'Consentement';
    if (pathname.includes('/dashboard')) return 'Tableau de bord';
    if (pathname.includes('/profile')) return 'Profil';
    if (pathname.includes('/upload')) return 'Chargement de donnée';
     if (pathname.includes('/edit-profile')) return 'Edition profil';
    return 'Accueil';
  };

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Vérification de la connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Espace Patient
                <span className="ml-2 text-m font-normal text-gray-600">
                  - {getCurrentModule()}
                </span>
              </h1>
            </div>
            <div className="flex items-center">
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span>Accueil</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}