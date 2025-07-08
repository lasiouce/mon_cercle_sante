'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PatientRegistration from './PatientRegistration';
import { toast } from 'sonner';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  birthYear: number;
  weightKg: number;
  sex: string;
}

export default function ProfileForm() {
  const { address } = useAccount();
  const [step, setStep] = useState<'blockchain' | 'profile'>('blockchain');
  const [blockchainPatientId, setBlockchainPatientId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    birthYear: 0,
    weightKg: 0,
    sex: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleBlockchainRegistrationSuccess = (patientId: number) => {
    setBlockchainPatientId(patientId);
    setStep('profile');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!blockchainPatientId) {
      toast.error('ID blockchain manquant');
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/patient/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: blockchainPatientId, // Utiliser l'ID blockchain
          walletAddress: address,
          ...formData
        }),
      });

      if (response.ok) {
        toast.success('Profil enregistré avec succès!');
        // Redirection vers le dashboard
        window.location.href = '/patient/dashboard';
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'blockchain') {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center">Enregistrement Patient</h2>
        <PatientRegistration onRegistrationSuccess={handleBlockchainRegistrationSuccess} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Profil Patient</h2>
        <p className="text-sm text-green-600">ID Blockchain: {blockchainPatientId}</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        
        <div>
          <Label htmlFor="birthYear">Année de naissance</Label>
          <Input
            id="birthYear"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={formData.birthYear || ''}
            onChange={(e) => setFormData({...formData, birthYear: e.target.value ? parseInt(e.target.value) : 0})}
          />
        </div>
        
        <div>
          <Label htmlFor="weightKg">Poids en kg</Label>
          <Input
            id="weightKg"
            type="number"
            step="0.1"
            min="0"
            max="999"
            value={formData.weightKg || ''}
            onChange={(e) => setFormData({...formData, weightKg: e.target.value ? parseFloat(e.target.value) : 0})}
          />
        </div>
        
        <div>
          <Label htmlFor="sex">Sexe (optionnel)</Label>
          <Select onValueChange={(value) => setFormData({...formData, sex: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez votre sexe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculin</SelectItem>
              <SelectItem value="F">Féminin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Enregistrement...' : 'Finaliser l\'enregistrement'}
        </Button>
      </form>
    </div>
  );
}