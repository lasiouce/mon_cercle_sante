'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ResearcherInfo } from '@/hooks/useResearcherData';

interface ResearcherHeaderProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  researcherInfo?: ResearcherInfo | null;
  backUrl?: string;
}

export default function ResearcherHeader({ 
  title, 
  icon: IconComponent, 
  researcherInfo, 
  backUrl = '/researcher/dashboard' 
}: ResearcherHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(backUrl)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
            <div className="flex items-center space-x-2">
              <IconComponent className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
          </div>
          {researcherInfo && (
            <div className="text-sm text-gray-600">
              {researcherInfo.firstName} {researcherInfo.lastName}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}