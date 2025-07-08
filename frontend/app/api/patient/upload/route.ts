import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Schéma de validation pour les mesures
const measurementSchema = z.object({
  patientId: z.number().int().positive(),
  studyId: z.string().min(1),
  measurements: z.array(z.object({
    measurementType: z.enum(['GLUCOSE', 'INSULIN', 'HBA1C', 'WEIGHT', 'BMI']),
    value: z.number().positive(),
    timestamp: z.string().datetime(),
    mealContext: z.enum(['FASTING', 'BEFORE_MEAL', 'AFTER_MEAL', 'BEDTIME']).optional(),
    labName: z.string().max(100).optional(),
    deviceModel: z.string().max(50).optional()
  })).min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = measurementSchema.parse(body);
    
    const { patientId, studyId, measurements } = validatedData;

    // Vérifier que le patient existe
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
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

    // Vérifier que l'étude existe et est approuvée
    const study = await prisma.study.findUnique({
      where: { id: studyId, isApproved: true }
    });

    if (!study) {
      return NextResponse.json(
        {
          error: 'Étude non trouvée ou non approuvée',
          code: 'STUDY_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Créer un hash unique pour ce dataset
    const datasetContent = JSON.stringify({
      patientId,
      studyId,
      measurements: measurements.map(m => ({
        type: m.measurementType,
        value: m.value,
        timestamp: m.timestamp
      })),
      timestamp: new Date().toISOString()
    });
    
    const datasetHash = `0x${createHash('sha256').update(datasetContent).digest('hex')}`;

    // Transaction pour créer la référence dataset et les mesures
    const result = await prisma.$transaction(async (tx) => {
      // Créer ou récupérer la référence dataset
      let datasetReference = await tx.datasetReference.findUnique({
        where: { datasetHash }
      });

      if (!datasetReference) {
        datasetReference = await tx.datasetReference.create({
          data: {
            datasetHash,
            patientId,
            studyId
          }
        });
      }

      // Créer les mesures
      const createdMeasurements = await Promise.all(
        measurements.map(measurement => 
          tx.measurement.create({
            data: {
              datasetHash,
              measurementType: measurement.measurementType,
              value: measurement.value,
              timestamp: new Date(measurement.timestamp),
              mealContext: measurement.mealContext,
              labName: measurement.labName,
              deviceModel: measurement.deviceModel
            }
          })
        )
      );

      return {
        datasetReference,
        measurements: createdMeasurements
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Mesures sauvegardées avec succès',
      datasetHash: result.datasetReference.datasetHash,
      measurementCount: result.measurements.length
    });

  } catch (error) {
    console.error('Erreur lors de la sauvegarde des mesures:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la sauvegarde des mesures',
        code: 'SAVE_MEASUREMENTS_ERROR'
      },
      { status: 500 }
    );
  }
}