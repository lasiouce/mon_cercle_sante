'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Calendar, Hash, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { consentContractABI, consentContractAddress } from '@/constants';
import { toast } from 'sonner';

interface ConsentData {
  consentId: bigint;
  datasetHash: string;
  studyId: bigint;
  validUntil: bigint;
  createdAt: bigint;
  revokedAt: bigint;
  isActive: boolean;
}

export default function PatientConsents() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer l'ID du patient
  const { data: patientId, error: patientIdError } = useReadContract({
    address: consentContractAddress,
    abi: consentContractABI,
    functionName: 'getPatientId',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected
    }
  });

  // Récupérer les IDs des consentements
  const { data: consentIds, error: consentIdsError } = useReadContract({
    address: consentContractAddress,
    abi: consentContractABI,
    functionName: 'getPatientConsents',
    args: patientId ? [patientId] : undefined,
    query: {
      enabled: !!patientId
    }
  });

  // Récupérer les détails de chaque consentement
  useEffect(() => {
    const fetchConsentDetails = async () => {
      if (!patientId || !consentIds || !Array.isArray(consentIds)) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const consentPromises = consentIds.map(async (consentId: bigint) => {
          try {
            const response = await fetch('/api/blockchain/consent-details', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                consentId: consentId.toString(),
                patientId: patientId.toString()
              })
            });
            
            const data = await response.json();
            if (data.success) {
              return data.consent;
            }
            return null;
          } catch (error) {
            console.error(`Erreur lors de la récupération du consentement ${consentId}:`, error);
            return null;
          }
        });

        const consentDetails = await Promise.all(consentPromises);
        const validConsents = consentDetails.filter(consent => consent !== null);
        setConsents(validConsents);
      } catch (error) {
        console.error('Erreur lors de la récupération des consentements:', error);
        setError('Erreur lors du chargement des consentements');
        toast.error('Erreur lors du chargement des consentements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsentDetails();
  }, [patientId, consentIds]);

  useEffect(() => {
    if (patientIdError || consentIdsError) {
      setError('Patient non enregistré ou erreur de connexion à la blockchain');
      setIsLoading(false);
    }
  }, [patientIdError, consentIdsError]);

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isConsentExpired = (validUntil: bigint) => {
    return Number(validUntil) * 1000 < Date.now();
  };

  const getConsentStatus = (consent: ConsentData) => {
    if (!consent.isActive) {
      return { status: 'Révoqué', color: 'destructive', icon: XCircle };
    }
    if (isConsentExpired(consent.validUntil)) {
      return { status: 'Expiré', color: 'secondary', icon: Clock };
    }
    return { status: 'Actif', color: 'default', icon: CheckCircle };
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Veuillez connecter votre wallet pour voir vos consentements.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/patient/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au dashboard
            </Button>
          </div>
          
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes Consentements</h1>
              <p className="text-gray-600">Gérez vos consentements pour les études de recherche</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des consentements...</p>
            </div>
          </div>
        ) : error ? (
          <Alert className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : consents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun consentement</h3>
                <p className="text-gray-600 mb-4">
                  Vous n'avez encore accordé aucun consentement pour des études de recherche.
                </p>
                <Button onClick={() => router.push('/patient/upload')}>
                  Commencer par uploader des données
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{consents.length}</div>
                    <div className="text-sm text-gray-600">Total consentements</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {consents.filter(c => c.isActive && !isConsentExpired(c.validUntil)).length}
                    </div>
                    <div className="text-sm text-gray-600">Actifs</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {consents.filter(c => !c.isActive).length}
                    </div>
                    <div className="text-sm text-gray-600">Révoqués</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Liste des consentements */}
            <div className="space-y-4">
              {consents.map((consent) => {
                const statusInfo = getConsentStatus(consent);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <Card key={consent.consentId.toString()} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <StatusIcon className="h-5 w-5" />
                            Consentement #{consent.consentId.toString()}
                          </CardTitle>
                          <CardDescription>
                            Étude ID: {consent.studyId.toString()}
                          </CardDescription>
                        </div>
                        <Badge variant={statusInfo.color as any}>
                          {statusInfo.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">Hash du dataset</p>
                              <p className="font-mono text-xs break-all">{consent.datasetHash}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">Date de création</p>
                              <p className="text-sm font-medium">{formatDate(consent.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">Valide jusqu'au</p>
                              <p className="text-sm font-medium">{formatDate(consent.validUntil)}</p>
                            </div>
                          </div>
                          
                          {consent.revokedAt > 0 && (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <div>
                                <p className="text-sm text-gray-500">Révoqué le</p>
                                <p className="text-sm font-medium text-red-600">{formatDate(consent.revokedAt)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}