import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour l'adresse wallet
const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
  message: "L'adresse wallet doit être une adresse Ethereum valide"
});

export async function GET(request: NextRequest) {
  try {
    // Récupérer l'adresse depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: "L'adresse wallet est requise" },
        { status: 400 }
      );
    }

    // Valider l'adresse wallet
    const validationResult = walletAddressSchema.safeParse(address);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Adresse wallet invalide", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Rechercher le chercheur par adresse wallet
    const researcher = await prisma.researcher.findUnique({
      where: {
        walletAddress: address
      },
      include: {
        createdStudies: {
          select: {
            id: true,
            description: true,
            protocolUrl: true,
            isApproved: true,
            createdAt: true
          }
        },
        researcherStudies: {
          include: {
            study: {
              select: {
                id: true,
                description: true,
                protocolUrl: true,
                isApproved: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!researcher) {
      return NextResponse.json(
        { error: "Chercheur non trouvé" },
        { status: 404 }
      );
    }
    const response = {
      success: true,
      researcher: {
        id: researcher.id,
        firstName: researcher.firstName,
        lastName: researcher.lastName,
        institution: researcher.institution,
        email: researcher.email,
        walletAddress: researcher.walletAddress,
        createdAt: researcher.createdAt.toISOString(),
        createdStudies: researcher.createdStudies,
        collaborativeStudies: researcher.researcherStudies.map(rs => rs.study)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur lors de la récupération du chercheur:', error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}