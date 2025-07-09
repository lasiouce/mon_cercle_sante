import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { consentContractABI, consentContractAddress } from '@/constants';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
});

export async function POST(request: NextRequest) {
  try {
    const { patientId } = await request.json();

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId est requis' },
        { status: 400 }
      );
    }
    // 1. Récupérer le nombre total de consentements
    const consentCount = await publicClient.readContract({
      address: consentContractAddress,
      abi: consentContractABI,
      functionName: 'getPatientConsentCount',
      args: [BigInt(patientId)]
    });

    // 2. Récupérer tous les IDs de consentements
    const consentIds = await publicClient.readContract({
      address: consentContractAddress,
      abi: consentContractABI,
      functionName: 'getPatientConsents',
      args: [patientId]
    });

    // 3. Récupérer les détails de tous les consentements en une seule fois
    const consentsWithDetails = await Promise.all(
        consentIds.map(async (consentId: bigint) => {
        try {
            const consentDetails = await publicClient.readContract({
            address: consentContractAddress,
            abi: consentContractABI,
            functionName: 'getConsentDetails',
            args: [consentId, patientId]
            });
            // Formater les données pour le frontend
            return {
                consentId: consentDetails.consentId.toString(),
                datasetHash: consentDetails.datasetHash,
                studyId: consentDetails.studyId.toString(),
                validUntil: consentDetails.validUntil.toString(),
                createdAt: consentDetails.createdAt.toString(),
                revokedAt: consentDetails.revokedAt.toString(),
                isActive: consentDetails.isActive,
          };
        } catch (error) {
          console.error(`Erreur lors de la vérification du consentement ${consentId}:`, error);
          return null;
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      totalCount: Number(consentCount),
      consents: consentsWithDetails
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des consentements:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des consentements' },
      { status: 500 }
    );
  }
}