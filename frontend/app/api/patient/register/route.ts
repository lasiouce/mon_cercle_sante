import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schéma de validation pour l'enregistrement d'un patient
const registerPatientSchema = z.object({
  id: z.number().int().positive(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Adresse wallet invalide'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  weightKg: z.number().positive().optional(),
  sex: z.enum(['M', 'F']).optional(),
  diabeteType: z.enum(['TYPE_1', 'TYPE_2']).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation des données
    const validatedData = registerPatientSchema.parse(body);
    
    // Vérifier si le patient existe déjà
    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: [
          { id: validatedData.id },
          { walletAddress: validatedData.walletAddress }
        ]
      }
    });
    
    if (existingPatient) {
      return NextResponse.json(
        { 
          error: 'Patient déjà enregistré',
          code: 'PATIENT_ALREADY_EXISTS',
          existingPatient: {
            id: existingPatient.id,
            walletAddress: existingPatient.walletAddress
          }
        },
        { status: 409 }
      );
    }
    
    // Créer le nouveau patient
    const newPatient = await prisma.patient.create({
      data: {
        id: validatedData.id,
        walletAddress: validatedData.walletAddress,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        birthYear: validatedData.birthYear,
        weightKg: validatedData.weightKg,
        sex: validatedData.sex,
        diabeteType: validatedData.diabeteType
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Patient enregistré avec succès',
        patient: {
          id: newPatient.id,
          walletAddress: newPatient.walletAddress,
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          createdAt: newPatient.createdAt
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du patient:', error);
    
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
    
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Conflit de données - Patient déjà existant',
          code: 'UNIQUE_CONSTRAINT_VIOLATION'
        },
        { status: 409 }
      );
    }
    
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