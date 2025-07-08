'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PatientFormFields, { PatientFormData } from '@/components/patient/PatientFormFields';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PatientInfo {
  id: number;
  walletAddress: string;
  firstName: string;
  lastName: string;
  email?: string;
  birthYear?: number;
  weightKg?: number;
  sex?: string;
  diabeteType?: string;
}

export default function EditProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    birthYear: 0,
    weightKg: 0,
    sex: '',
    diabeteType: ''
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    const fetchPatientInfo = async () => {
      if (!address) return;
      
      try {
        const response = await fetch(`/api/patient/wallet/${address}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          const patient = data.patient;
          setPatientInfo(patient);
          // Pré-remplir le formulaire avec les données existantes
          setFormData({
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            email: patient.email || '',
            birthYear: patient.birthYear || 0,
            weightKg: patient.weightKg || 0,
            sex: patient.sex || '',
            diabeteType: patient.diabeteType || ''
          });
        } else {
          toast.error('Patient non trouvé');
          router.push('/patient/profile');
          return;
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        toast.error('Erreur lors du chargement du profil');
        router.push('/patient/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientInfo();
  }, [address, isConnected, router]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.birthYear || !formData.weightKg || !formData.sex || !formData.diabeteType) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }
    
    // Afficher la boîte de dialogue de confirmation
    setShowConfirmDialog(true);
  };

  const handleConfirmUpdate = async () => {
    if (!patientInfo) {
      toast.error('Informations patient manquantes');
      return;
    }
    
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const response = await fetch(`/api/patient/${patientInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Profil mis à jour avec succès!');
        // Redirection vers le dashboard après un court délai
        setTimeout(() => {
          router.push('/patient/dashboard');
        }, 1500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelUpdate = () => {
    setShowConfirmDialog(false);
  };

  const handleCancelEdit = () => {
    router.push('/patient/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Chargement du profil...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Modifier mon profil</h1>
            <p className="text-gray-600 mt-2">
              Mettez à jour vos informations personnelles
            </p>
          </div>
          
          <PatientFormFields
            formData={formData}
            onFormDataChange={setFormData}
            onSubmit={handleFormSubmit}
            isLoading={isSubmitting}
            submitButtonText="Mettre à jour le profil"
            showBlockchainId={false}
          />
          
          {/* Bouton d'annulation */}
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={handleCancelEdit}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          </div>

          {/* Boîte de dialogue de confirmation */}
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la modification</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir modifier vos informations personnelles ? 
                  Cette action mettra à jour votre profil dans la base de données.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCancelUpdate}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmUpdate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Mise à jour...' : 'Confirmer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}