import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Récupérer un patient par adresse wallet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Attendre les paramètres avant de les utiliser
    const { address } = await params;
    const walletAddress = address;
    
    // Validation de l'adresse wallet
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        {
          error: 'Adresse wallet invalide',
          code: 'INVALID_WALLET_ADDRESS'
        },
        { status: 400 }
      );
    }
    
    const patient = await prisma.patient.findUnique({
      where: { walletAddress },
      include: {
        datasetReferences: {
          include: {
            study: true
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
    
    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        walletAddress: patient.walletAddress,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        birthYear: patient.birthYear,
        weightKg: patient.weightKg,
        sex: patient.sex,
        diabeteType: patient.diabeteType,
        createdAt: patient.createdAt,
        datasetReferences: patient.datasetReferences
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du patient par wallet:', error);
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