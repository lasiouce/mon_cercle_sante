'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';


interface StudyFormData {         
  description: string;  
  protocolUrl: string;  
  isApproved: boolean;  
}

export default function ResearchUploadForm() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
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

  const generateStudyId = () => {
    // Génère un ID unique pour l'étude (max 66 caractères)
    const timestamp = Date.now().toString();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const studyId = `study_${timestamp}_${randomSuffix}`;
    
    // S'assurer que l'ID ne dépasse pas 66 caractères
    return studyId.substring(0, 66);
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
        creatorAddress: address // Pour identifier le chercheur
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
        // Réinitialiser le formulaire
        setFormData({
          description: '',
          protocolUrl: '',
          isApproved: false
        });
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

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
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
              <Label htmlFor="description">Description de l'étude *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez les objectifs, la méthodologie et les bénéfices attendus de votre étude..."
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Description détaillée de votre étude de recherche.
              </p>
            </div>

            {/* URL du protocole */}
            <div>
              <Label htmlFor="protocolUrl">URL du protocole</Label>
              <Input
                id="protocolUrl"
                type="url"
                value={formData.protocolUrl}
                onChange={(e) => handleInputChange('protocolUrl', e.target.value)}
                placeholder="https://exemple.com/protocole-etude.pdf"
                maxLength={512}
              />
              <p className="text-sm text-gray-500 mt-1">
                Lien vers le document de protocole de l'étude (maximum 512 caractères).
              </p>
            </div>

            {/* Statut d'approbation */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isApproved"
                checked={formData.isApproved}
                onChange={(e) => handleInputChange('isApproved', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="isApproved" className="text-sm font-medium text-gray-700">
                Étude pré-approuvée
              </Label>
            </div>
            <p className="text-sm text-gray-500">
              Cochez cette case si l'étude a déjà reçu une approbation éthique préalable.
            </p>

            {/* Informations automatiques */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Informations automatiques</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Créateur :</strong> Sera automatiquement associé à votre compte chercheur</li>
                <li>• <strong>Date de création :</strong> Sera automatiquement définie à la soumission</li>
                <li>• <strong>Adresse wallet :</strong> {address}</li>
              </ul>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setFormData({
                  description: '',
                  protocolUrl: '',
                  isApproved: false
                })}
              >
                Réinitialiser
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Création...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Créer l'étude</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}