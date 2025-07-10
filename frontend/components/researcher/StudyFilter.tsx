'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Study } from '@/hooks/useResearcherData';

interface StudyFilterProps {
  studies: Study[];
  selectedStudy: string;
  onStudyChange: (studyId: string) => void;
}

export default function StudyFilter({ studies, selectedStudy, onStudyChange }: StudyFilterProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filtrer par étude</CardTitle>
      </CardHeader>
      <CardContent>
        <select 
          value={selectedStudy} 
          onChange={(e) => onStudyChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Toutes les études</option>
          {studies.map((study) => (
            <option key={study.id} value={study.id.toString()}>
              Étude #{study.id} - {study.description || 'Sans description'}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}