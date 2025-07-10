'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PatientData } from '@/hooks/useResearcherData';

interface PatientDataTableProps {
  patientData: PatientData[];
  isLoading: boolean;
}

export default function PatientDataTable({ patientData, isLoading }: PatientDataTableProps) {
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('fr-FR');
  };

  const isConsentExpired = (validUntil: bigint) => {
    return Number(validUntil) * 1000 < Date.now();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-gray-600">Chargement des données...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (patientData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-gray-600">Aucune donnée de patient disponible</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Données des patients consentants</CardTitle>
        <CardDescription>
          Toutes les données des patients qui ont consenti à vos études
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                {/* Colonnes supprimées pour l'anonymisation :
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead> */}
                <TableHead>Année de naissance</TableHead>
                <TableHead>Poids (kg)</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Type de diabète</TableHead>
                <TableHead>Étude</TableHead>
                <TableHead>Consentement</TableHead>
                <TableHead>Valide jusqu&apos;à</TableHead>
                <TableHead>Mesures</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patientData.map((data) => (
                <TableRow key={`${data.patientId}-${data.consentId}`}>
                  <TableCell className="font-medium">{data.patientId}</TableCell>
                  {/* Cellules supprimées pour l'anonymisation :
                  <TableCell>{data.firstName} {data.lastName}</TableCell>
                  <TableCell>{data.email || 'N/A'}</TableCell> */}
                  <TableCell>{data.birthYear || 'N/A'}</TableCell>
                  <TableCell>{data.weightKg || 'N/A'}</TableCell>
                  <TableCell>{data.sex || 'N/A'}</TableCell>
                  <TableCell>{data.diabeteType || 'N/A'}</TableCell>
                  <TableCell>Étude #{data.studyId}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {data.consentId.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{formatDate(data.validUntil)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {data.measurements.length} mesures
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {data.isActive && !isConsentExpired(data.validUntil) ? (
                      <Badge className="bg-green-100 text-green-800">Actif</Badge>
                    ) : (
                      <Badge variant="destructive">Inactif/Expiré</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}