'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PatientFormData {
  firstName: string;
  lastName: string;
  email: string;
  birthYear: number;
  weightKg: number;
  sex: string;
  diabeteType: string;
}

interface PatientFormFieldsProps {
  formData: PatientFormData;
  onFormDataChange: (data: PatientFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  submitButtonText?: string;
  showBlockchainId?: boolean;
  blockchainId?: number | null;
}

export default function PatientFormFields({
  formData,
  onFormDataChange,
  onSubmit,
  isLoading = false,
  submitButtonText = "Enregistrer",
  showBlockchainId = false,
  blockchainId = null
}: PatientFormFieldsProps) {
  
  const updateFormData = (field: keyof PatientFormData, value: string | number) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {showBlockchainId && blockchainId && (
        <div className="text-center">
          <h2 className="text-2xl font-bold">Profil Patient</h2>
          <p className="text-sm text-green-600">ID Blockchain: {blockchainId}</p>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="firstName">Prénom *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="lastName">Nom *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="birthYear">Année de naissance *</Label>
          <Input
            id="birthYear"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={formData.birthYear || ''}
            onChange={(e) => updateFormData('birthYear', e.target.value ? parseInt(e.target.value) : 0)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="weightKg">Poids en kg *</Label>
          <Input
            id="weightKg"
            type="number"
            step="0.1"
            min="0.1"
            max="999"
            value={formData.weightKg || ''}
            onChange={(e) => updateFormData('weightKg', e.target.value ? parseFloat(e.target.value) : 0)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="sex">Sexe *</Label>
          <Select value={formData.sex} onValueChange={(value) => updateFormData('sex', value)} required>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez votre sexe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculin</SelectItem>
              <SelectItem value="F">Féminin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="diabeteType">Type de diabète *</Label>
          <Select value={formData.diabeteType} onValueChange={(value) => updateFormData('diabeteType', value)} required>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez votre type de diabète" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TYPE_1">Type 1</SelectItem>
              <SelectItem value="TYPE_2">Type 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Chargement...' : submitButtonText}
        </Button>
      </form>
    </div>
  );
}