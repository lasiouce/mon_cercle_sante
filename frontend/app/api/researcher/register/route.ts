import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schéma de validation pour l'enregistrement d'un chercheur
const registerResearcherSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Adresse wallet invalide'),
  firstName: z.string().min(1, 'Prénom requis').max(100, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  institution: z.string().min(1, 'Institution requise').max(255, 'Institution trop longue').optional(),
  email: z.string().email('Email invalide').max(255, 'Email trop long').optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation des données
    const validatedData = registerResearcherSchema.parse(body);
    
    // Vérifier si le chercheur existe déjà
    const existingResearcher = await prisma.researcher.findUnique({
      where: { walletAddress: validatedData.walletAddress }
    });
    
    if (existingResearcher) {
      return NextResponse.json(
        { 
          error: 'Chercheur déjà enregistré',
          code: 'RESEARCHER_ALREADY_EXISTS',
          existingResearcher: {
            id: existingResearcher.id,
            walletAddress: existingResearcher.walletAddress,
            firstName: existingResearcher.firstName,
            lastName: existingResearcher.lastName
          }
        },
        { status: 409 }
      );
    }
    
    // Créer le nouveau chercheur
    const newResearcher = await prisma.researcher.create({
      data: {
        walletAddress: validatedData.walletAddress,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        institution: validatedData.institution,
        email: validatedData.email
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Chercheur enregistré avec succès',
        researcher: {
          id: newResearcher.id,
          walletAddress: newResearcher.walletAddress,
          firstName: newResearcher.firstName,
          lastName: newResearcher.lastName,
          institution: newResearcher.institution,
          email: newResearcher.email,
          createdAt: newResearcher.createdAt
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du chercheur:', error);
    
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
          error: 'Conflit de données - Chercheur déjà existant',
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