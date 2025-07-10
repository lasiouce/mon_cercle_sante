'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, Activity, Database } from 'lucide-react';
import { PatientData, Study } from '@/hooks/useResearcherData';

interface DataStatisticsProps {
  patientData: PatientData[];
  studies: Study[];
}

export default function DataStatistics({ patientData, studies }: DataStatisticsProps) {
  const isConsentExpired = (validUntil: bigint) => {
    return Number(validUntil) * 1000 < Date.now();
  };

  const activeConsents = patientData.filter(data => data.isActive && !isConsentExpired(data.validUntil));
  const totalMeasurements = patientData.reduce((sum, data) => sum + data.measurements.length, 0);

  const stats = [
    {
      icon: Users,
      value: patientData.length,
      label: 'Patients Total',
      color: 'text-blue-600'
    },
    {
      icon: Calendar,
      value: activeConsents.length,
      label: 'Consentements Actifs',
      color: 'text-green-600'
    },
    {
      icon: Activity,
      value: totalMeasurements,
      label: 'Mesures Total',
      color: 'text-purple-600'
    },
    {
      icon: Database,
      value: studies.length,
      label: 'Études',
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-center">
                <IconComponent className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}