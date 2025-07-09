'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import AuthorizeStudyOnContract from './AuthorizeStudyOnContract';

interface StudyFormData {
  description: string;
  protocolUrl: string;
  isApproved: boolean;
}

interface CreatedStudy {
  id: number;
  description: string;
  protocolUrl: string | null;
  isApproved: boolean;
}

export default function ResearchUploadForm() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [createdStudy, setCreatedStudy] = useState<CreatedStudy | null>(null);
  const [showBlockchainAuth, setShowBlockchainAuth] = useState(false);
  const [formData, setFormData] = useState<StudyFormData>({
    description: '',
    protocolUrl: '',
    isApproved: false
  });

  const handleInputChange = (field: keyof StudyFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs obligatoires
    if (!formData.description.trim()) {
      toast.error('La description de l\'étude est obligatoire');
      return;
    }

    // Validation de l'URL du protocole (optionnel mais doit être valide si fourni)
    if (formData.protocolUrl && !isValidUrl(formData.protocolUrl)) {
      toast.error('Veuillez fournir une URL de protocole valide');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        description: formData.description.trim(),
        protocolUrl: formData.protocolUrl.trim() || null,
        isApproved: formData.isApproved,
        creatorAddress: address
      };
      
      const response = await fetch('/api/researcher/studies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Étude créée avec succès!');
        setCreatedStudy(data.study);
        
        // Si l'étude est approuvée, afficher le composant blockchain
        if (formData.isApproved) {
          setShowBlockchainAuth(true);
        } else {
          // Réinitialiser le formulaire si pas d'autorisation blockchain nécessaire
          resetForm();
        }
      } else {
        toast.error(data.error || 'Erreur lors de la création de l\'étude');
      }
      
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la création de l\'étude');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      protocolUrl: '',
      isApproved: false
    });
    setCreatedStudy(null);
    setShowBlockchainAuth(false);
  };

  const handleBlockchainSuccess = () => {
    toast.success('Processus complet! Étude créée et autorisée sur la blockchain.');
    resetForm();
  };

  const handleBlockchainError = (error: string) => {
    toast.error(`Erreur blockchain: ${error}`);
    // On peut choisir de garder l'étude créée même si l'autorisation blockchain échoue
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (error) {
      return error;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Formulaire de création d'étude */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-6 h-6" />
            <span>Créer une nouvelle étude de recherche</span>
          </CardTitle>
          <CardDescription>
            Remplissez les informations de votre étude selon le schéma de base de données.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="description">Description de l&apos;étude *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez les objectifs, la méthodologie et les bénéfices attendus de votre étude..."
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={showBlockchainAuth}
              />
              <p className="text-sm text-gray-500 mt-1">
                Description détaillée de votre étude de recherche.
              </p>
            </div>

            <div>
              <Label htmlFor="protocolUrl">URL du protocole</Label>
              <Input
                id="protocolUrl"
                type="url"
                value={formData.protocolUrl}
                onChange={(e) => handleInputChange('protocolUrl', e.target.value)}
                placeholder="https://exemple.com/protocole-etude.pdf"
                maxLength={512}
                disabled={showBlockchainAuth}
              />
              <p className="text-sm text-gray-500 mt-1">
                Lien vers le document de protocole de l&apos;étude (maximum 512 caractères).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isApproved"
                checked={formData.isApproved}
                onChange={(e) => handleInputChange('isApproved', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                disabled={showBlockchainAuth}
              />
              <Label htmlFor="isApproved" className="text-sm font-medium text-gray-700">
                Étude pré-approuvée
              </Label>
            </div>
            <p className="text-sm text-gray-500">
              Cochez cette case si l&apos;étude a déjà reçu une approbation éthique préalable.
              {formData.isApproved && (
                <span className="text-blue-600 font-medium">
                  {' '}Une autorisation sur la blockchain sera requise après la création.
                </span>
              )}
            </p>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Informations automatiques</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Créateur :</strong> Sera automatiquement associé à votre compte chercheur</li>
                <li>• <strong>Date de création :</strong> Sera automatiquement définie à la soumission</li>
                <li>• <strong>Adresse wallet :</strong> {address}</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={resetForm}
                disabled={isLoading}
              >
                Réinitialiser
              </Button>
              <Button type="submit" disabled={isLoading || showBlockchainAuth}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Création...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Créer l&apos;étude</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Composant d'autorisation blockchain */}
      {showBlockchainAuth && createdStudy && (
        <Card>
          <CardHeader>
            <CardTitle>Autorisation sur la blockchain</CardTitle>
            <CardDescription>
              Votre étude a été créée avec succès. Comme elle est marquée comme approuvée, 
              vous devez maintenant l&apos;autoriser sur la blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Détails de l&apos;étude créée :</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>ID :</strong> {createdStudy.id}</li>
                <li><strong>Description :</strong> {createdStudy.description}</li>
                <li><strong>Statut :</strong> {createdStudy.isApproved ? 'Approuvée' : 'En attente'}</li>
              </ul>
            </div>
            
            <AuthorizeStudyOnContract
              studyId={createdStudy.id.toString()}
              studyName={createdStudy.description}
              onSuccess={handleBlockchainSuccess}
              onError={handleBlockchainError}
            />
            
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={resetForm}
                className="w-full"
              >
                Ignorer l&apos;autorisation blockchain et créer une nouvelle étude
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}