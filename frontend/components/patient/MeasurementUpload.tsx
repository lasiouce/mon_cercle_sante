'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import DataUploadTriggerConsent from './DataUploadTriggerConsent';

interface Study {
  id: number;
  description: string;
  creator: {
    firstName: string;
    lastName: string;
    institution: string;
  };
}

interface Measurement {
  id: string;
  measurementType: string;
  value: number;
  timestamp: string;
  mealContext?: string;
  labName?: string;
  deviceModel?: string;
}

interface PatientInfo {
  id: number;
  firstName: string;
  lastName: string;
}

export default function MeasurementUpload() {
  const { address } = useAccount();
  const [studies, setStudies] = useState<Study[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [selectedStudyId, setSelectedStudyId] = useState<number | ''>('');
  const [measurements, setMeasurements] = useState<Measurement[]>([{
    id: '1',
    measurementType: '',
    value: 0,
    timestamp: new Date().toISOString().slice(0, 16),
    mealContext: '',
    labName: '',
    deviceModel: ''
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState<{
    datasetHash: string;
    studyId: number;
  } | null>(null);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      if (!address) return;
      
      try {
        setIsLoadingData(true);
        
        // Charger les informations du patient
        const patientResponse = await fetch(`/api/patient/wallet/${address}`);
        const patientData = await patientResponse.json();
        
        if (patientData.success) {
          setPatientInfo({
            id: patientData.patient.id,
            firstName: patientData.patient.firstName,
            lastName: patientData.patient.lastName
          });
        }
        
        // Charger les études
        const studiesResponse = await fetch('/api/studies');
        const studiesData = await studiesResponse.json();
        
        if (studiesData.success) {
          setStudies(studiesData.studies);
        }
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadData();
  }, [address]);

  const addMeasurement = () => {
    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      measurementType: '',
      value: 0,
      timestamp: new Date().toISOString().slice(0, 16),
      mealContext: '',
      labName: '',
      deviceModel: ''
    };
    setMeasurements([...measurements, newMeasurement]);
  };

  const removeMeasurement = (id: string) => {
    if (measurements.length > 1) {
      setMeasurements(measurements.filter(m => m.id !== id));
    }
  };

  const updateMeasurement = (id: string, field: keyof Measurement, value: string | number) => {
    setMeasurements(measurements.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientInfo || !selectedStudyId) {
      toast.error('Veuillez sélectionner une étude');
      return;
    }
    
    // Validation des mesures
    const validMeasurements = measurements.filter(m => 
      m.measurementType && m.value > 0 && m.timestamp
    );
    
    if (validMeasurements.length === 0) {
      toast.error('Veuillez ajouter au moins une mesure valide');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const payload = {
        patientId: patientInfo.id,
        studyId: Number(selectedStudyId),
        measurements: validMeasurements.map(m => ({
          measurementType: m.measurementType,
          value: Number(m.value),
          timestamp: new Date(m.timestamp).toISOString(),
          mealContext: m.mealContext || undefined,
          labName: m.labName || undefined,
          deviceModel: m.deviceModel || undefined
        }))
      };
      
      const response = await fetch('/api/patient/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`${data.measurementCount} mesure(s) sauvegardée(s) avec succès`);
        
        // Stocker les informations pour le consentement
        setUploadSuccess({
          datasetHash: data.datasetHash,
          studyId: Number(selectedStudyId)
        });
        
        // Réinitialiser le formulaire
        setMeasurements([{
          id: '1',
          measurementType: '',
          value: 0,
          timestamp: new Date().toISOString().slice(0, 16),
          mealContext: '',
          labName: '',
          deviceModel: ''
        }]);
        setSelectedStudyId('');
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde');
      }
      
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la sauvegarde des mesures');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsentSuccess = () => {
    toast.success('Processus terminé avec succès !');
    // Supprimer le setTimeout, laisser l'utilisateur fermer manuellement
  };

  const handleCloseConsent = () => {
    setUploadSuccess(null);
  };

  const handleConsentError = (error: string) => {
    console.error('Erreur de consentement:', error);
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!patientInfo) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Impossible de charger les informations du patient</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Mesures Médicales
          </CardTitle>
          <CardDescription>
            Patient: {patientInfo.firstName} {patientInfo.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection de l'étude */}
            <div className="space-y-2">
              <Label htmlFor="study">Étude de destination *</Label>
              <Select value={selectedStudyId.toString()} onValueChange={(value) => setSelectedStudyId(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une étude" />
                </SelectTrigger>
                <SelectContent>
                  {studies.map((study) => (
                    <SelectItem key={study.id} value={study.id.toString()}>
                      <div>
                        <div className="font-medium">{study.description}</div>
                        <div className="text-sm text-gray-500">
                          {study.creator.firstName} {study.creator.lastName} - {study.creator.institution}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Liste des mesures */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Mesures *</Label>
                <Button type="button" onClick={addMeasurement} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une mesure
                </Button>
              </div>
              
              {measurements.map((measurement) => (
                <Card key={measurement.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Type de mesure *</Label>
                      <Select 
                        value={measurement.measurementType} 
                        onValueChange={(value) => updateMeasurement(measurement.id, 'measurementType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GLUCOSE">Glucose</SelectItem>
                          <SelectItem value="INSULIN">Insuline</SelectItem>
                          <SelectItem value="HBA1C">HbA1c</SelectItem>
                          <SelectItem value="WEIGHT">Poids</SelectItem>
                          <SelectItem value="BMI">IMC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Valeur *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={measurement.value}
                        onChange={(e) => updateMeasurement(measurement.id, 'value', parseFloat(e.target.value) || 0)}
                        placeholder="Valeur"
                      />
                    </div>
                    
                    <div>
                      <Label>Date et heure *</Label>
                      <Input
                        type="datetime-local"
                        value={measurement.timestamp}
                        onChange={(e) => updateMeasurement(measurement.id, 'timestamp', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Contexte repas</Label>
                      <Select 
                        value={measurement.mealContext || ''} 
                        onValueChange={(value) => updateMeasurement(measurement.id, 'mealContext', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Contexte" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FASTING">À jeun</SelectItem>
                          <SelectItem value="BEFORE_MEAL">Avant repas</SelectItem>
                          <SelectItem value="AFTER_MEAL">Après repas</SelectItem>
                          <SelectItem value="BEDTIME">Coucher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Laboratoire</Label>
                      <Input
                        value={measurement.labName || ''}
                        onChange={(e) => updateMeasurement(measurement.id, 'labName', e.target.value)}
                        placeholder="Nom du laboratoire"
                      />
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label>Modèle d&apos;appareil</Label>
                        <Input
                          value={measurement.deviceModel || ''}
                          onChange={(e) => updateMeasurement(measurement.id, 'deviceModel', e.target.value)}
                          placeholder="Modèle"
                        />
                      </div>
                      {measurements.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeMeasurement(measurement.id)}
                          variant="outline"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sauvegarde en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Sauvegarder les mesures
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {uploadSuccess && patientInfo && (
        <DataUploadTriggerConsent
          studyId={BigInt(uploadSuccess.studyId)}
          datasetHash={uploadSuccess.datasetHash}
          patientId={patientInfo.id}
          onSuccess={handleConsentSuccess}
          onError={handleConsentError}
          onClose={handleCloseConsent}
        />
      )}
    </div>
  );
}