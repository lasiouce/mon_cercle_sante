import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Récupérer les données d'un patient avec ses mesures filtrées par datasetHash
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get('patientId');
    const datasetHash = searchParams.get('datasetHash');
    
    // Validation des paramètres
    if (!patientIdParam) {
      return NextResponse.json(
        {
          error: 'patientId est requis',
          code: 'MISSING_PATIENT_ID'
        },
        { status: 400 }
      );
    }
    
    if (!datasetHash) {
      return NextResponse.json(
        {
          error: 'datasetHash est requis',
          code: 'MISSING_DATASET_HASH'
        },
        { status: 400 }
      );
    }
    
    const patientId = parseInt(patientIdParam);
    
    if (isNaN(patientId)) {
      return NextResponse.json(
        {
          error: 'patientId doit être un nombre valide',
          code: 'INVALID_PATIENT_ID'
        },
        { status: 400 }
      );
    }
    
    // Récupérer le patient
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        datasetReferences: {
          where: {
            datasetHash: datasetHash
          },
          include: {
            measurements: true
          }
        }
      }
    });

    if (!patient) {
      return NextResponse.json(
        {
          error: 'Patient non trouvé',
          code: 'PATIENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Extraire les mesures des références de dataset
    const filteredMeasurements = patient.datasetReferences
      .flatMap(ref => ref.measurements)
      .map(measurement => ({
        id: measurement.id,
        measurementType: measurement.measurementType,
        value: measurement.value,
        timestamp: measurement.timestamp.toISOString(),
        mealContext: measurement.mealContext,
        labName: measurement.labName,
        deviceModel: measurement.deviceModel
      }));
    
    // Préparer la réponse avec les données du patient (anonymisées)
    const patientData = {
      patientId: patient.id.toString(),
      // Informations supprimées pour l'anonymisation :
      // firstName, lastName, email
      birthYear: patient.birthYear,
      weightKg: patient.weightKg,
      sex: patient.sex,
      diabeteType: patient.diabeteType,
      measurements: filteredMeasurements
    };

    return NextResponse.json({
      success: true,
      ...patientData
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des données du patient:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}