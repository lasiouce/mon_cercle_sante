'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Building, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

interface ResearcherRegistrationProps {
  onRegistrationSuccess: () => void;
}

interface ResearcherFormData {
  firstName: string;
  lastName: string;
  institution: string;
  email: string;
}

export default function ResearcherRegistration({ onRegistrationSuccess }: ResearcherRegistrationProps) {
  const { address } = useAccount();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState<ResearcherFormData>({
    firstName: '',
    lastName: '',
    institution: '',
    email: ''
  });

  const handleInputChange = (field: keyof ResearcherFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      toast.error('Veuillez connecter votre wallet');
      return;
    }

    // Validation des champs obligatoires
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }

    try {
      setIsRegistering(true);
      
      const payload = {
        walletAddress: address,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        institution: formData.institution.trim() || undefined,
        email: formData.email.trim() || undefined
      };
      
      const response = await fetch('/api/researcher/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Enregistrement réussi ! Bienvenue dans l\'espace chercheur.');
        onRegistrationSuccess();
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement');
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="w-6 h-6" />
            <span>Enregistrement Chercheur</span>
          </CardTitle>
          <CardDescription>
            Complétez votre profil pour accéder à l'espace chercheur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations personnelles */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Votre prénom"
                    className="pl-10"
                    maxLength={100}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Votre nom"
                    className="pl-10"
                    maxLength={100}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Institution */}
            <div>
              <Label htmlFor="institution">Institution</Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="institution"
                  type="text"
                  value={formData.institution}
                  onChange={(e) => handleInputChange('institution', e.target.value)}
                  placeholder="Université, hôpital, laboratoire..."
                  className="pl-10"
                  maxLength={255}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="votre.email@institution.fr"
                  className="pl-10"
                  maxLength={255}
                />
              </div>
            </div>

            {/* Informations automatiques */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Informations automatiques</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Adresse wallet :</strong> {address}</li>
                <li>• <strong>Date d'enregistrement :</strong> Sera automatiquement définie</li>
                <li>• <strong>ID unique :</strong> Sera généré automatiquement</li>
              </ul>
            </div>

            {/* Bouton de soumission */}
            <Button type="submit" disabled={isRegistering} className="w-full">
              {isRegistering ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Enregistrement...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4" />
                  <span>S'enregistrer</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}