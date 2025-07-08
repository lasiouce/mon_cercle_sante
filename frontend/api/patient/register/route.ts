import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, walletAddress, firstName, lastName, email, birthYear, weightKg, sex } = body;

    // Validation des champs requis
    if (!id || !walletAddress || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Les champs id, walletAddress, firstName et lastName sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si le patient existe déjà (par ID ou wallet)
    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: [
          { id: id },
          { walletAddress }
        ]
      }
    });

    if (existingPatient) {
      return NextResponse.json(
        { error: 'Un patient avec cet ID ou cette adresse wallet existe déjà' },
        { status: 409 }
      );
    }

    // Créer le nouveau patient avec l'ID blockchain
    const patient = await prisma.patient.create({
      data: {
        id: id, 
        walletAddress,
        firstName,
        lastName,
        email: email || null,
        birthYear: birthYear || null,
        weightKg: weightKg || null,
        sex: sex || null,
      },
    });

    return NextResponse.json(
      { 
        message: 'Patient enregistré avec succès',
        patient: {
          id: patient.id,
          walletAddress: patient.walletAddress,
          firstName: patient.firstName,
          lastName: patient.lastName
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du patient:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// GET method reste inchangé
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress est requis' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        walletAddress: true,
        firstName: true,
        lastName: true,
        email: true,
        birthYear: true,
        weightKg: true,
        sex: true,
        createdAt: true
      }
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });

  } catch (error) {
    console.error('Erreur lors de la récupération du patient:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}