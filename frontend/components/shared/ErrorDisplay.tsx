'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
}

export default function ErrorDisplay({ 
  error, 
  onRetry, 
  onBack, 
  backLabel = 'Retour' 
}: ErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <div className="text-red-500 text-lg font-semibold mb-2">Erreur</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              {onRetry && (
                <Button onClick={onRetry} variant="outline">
                  Réessayer
                </Button>
              )}
              {onBack && (
                <Button onClick={onBack}>
                  {backLabel}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}