'use client';

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { usePatientId } from '@/hooks/usePatientId';
import { usePatientConsents, type ConsentData } from '@/hooks/usePatientConsents';

// Composant pour l'état de chargement
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des consentements...</p>
      </div>
    </div>
  );
}

// Composant pour l'état d'erreur
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Alert className="mb-6">
      <XCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Composant pour l'état vide
function EmptyState() {
  const router = useRouter();
  
  return (
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
  );
}

// Composant pour les statistiques
function ConsentStats({ consents }: { consents: ConsentData[] }) {
  const isConsentExpired = (validUntil: bigint) => {
    return Number(validUntil) * 1000 < Date.now();
  };

  const activeCount = consents.filter(c => c.isActive && !isConsentExpired(c.validUntil)).length;
  const revokedCount = consents.filter(c => !c.isActive).length;

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{consents.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-gray-600">Actifs</div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{revokedCount}</div>
            <div className="text-sm text-gray-600">Révoqués</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant pour une carte de consentement
function ConsentCard({ consent }: { consent: ConsentData }) {
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

  const statusInfo = getConsentStatus(consent);
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              Consentement #{consent.consentId}
            </CardTitle>
            <CardDescription>
              Étude ID: {consent.studyId}
            </CardDescription>
          </div>
          <Badge variant={statusInfo.color as any}>
            {statusInfo.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Créé le:</span>
            <p className="text-gray-600">{formatDate(consent.createdAt)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Valide jusqu'au:</span>
            <p className="text-gray-600">{formatDate(consent.validUntil)}</p>
          </div>
          {consent.revokedAt > 0 && (
            <div>
              <span className="font-medium text-gray-700">Révoqué le:</span>
              <p className="text-gray-600">{formatDate(consent.revokedAt)}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-700">Hash des données:</span>
            <p className="text-gray-600 font-mono text-xs break-all">{consent.datasetHash}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant principal
export default function PatientConsents() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { patientId, isLoading: patientIdLoading, error: patientIdError } = usePatientId();
  const { consents, isLoading: consentsLoading, error: consentsError, refetch } = usePatientConsents(patientId);

  const isLoading = patientIdLoading || consentsLoading;
  const error = patientIdError || consentsError;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              Veuillez connecter votre wallet pour voir vos consentements.
            </p>
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mes Consentements</h1>
                <p className="text-gray-600">Gérez vos consentements pour les études de recherche</p>
              </div>
            </div>
            
            {!isLoading && !error && (
              <Button variant="outline" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : consents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            <ConsentStats consents={consents} />
            <div className="space-y-4">
              {consents.map((consent) => (
                <ConsentCard key={consent.consentId} consent={consent} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}