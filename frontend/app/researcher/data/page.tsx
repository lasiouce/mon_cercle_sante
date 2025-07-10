'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { useResearcherData } from '@/hooks/useResearcherData';
import ResearcherHeader from '@/components/researcher/ResearcherHeader';
import DataStatistics from '@/components/researcher/DataStatistics';
import StudyFilter from '@/components/researcher/StudyFilter';
import PatientDataTable from '@/components/researcher/PatientDataTable';
import ErrorDisplay from '@/components/shared/ErrorDisplay';

export default function ResearcherDataPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [selectedStudy, setSelectedStudy] = useState<string>('all');
  
  const {
    researcherInfo,
    patientData,
    studies,
    isLoading,
    error,
    refetch
  } = useResearcherData();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  const filteredData = selectedStudy === 'all' 
    ? patientData 
    : patientData.filter(data => data.studyId === selectedStudy);

  if (!isConnected) {
    return null;
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error}
        onRetry={refetch}
        onBack={() => router.push('/researcher/dashboard')}
        backLabel="Retour au tableau de bord"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResearcherHeader 
        title="Données des Patients"
        icon={Database}
        researcherInfo={researcherInfo}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DataStatistics 
          patientData={filteredData} 
          studies={studies} 
        />
        
        <StudyFilter 
          studies={studies}
          selectedStudy={selectedStudy}
          onStudyChange={setSelectedStudy}
        />
        
        <PatientDataTable 
          patientData={filteredData}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}