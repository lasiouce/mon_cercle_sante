# Mon Cercle Sante Test
## Table des matières
* [Gestion de consentements médicaux](#gestion-de-consentements-médicaux)
* [Génération points fidélités](#cercle-token--points-de-fidélités)

## Gestion de consentements médicaux

Le contrat `MedicalConsentNFT` est un contrat de gestion de consentements médicaux basé sur les NFTs (ERC721). Il permet aux patients d'accorder et de révoquer leur consentement pour l'utilisation de leurs données médicales dans des études spécifiques.

#### Fonctions principales

##### Gestion des patients
- `registerPatient()` : Permet à un utilisateur de s'enregistrer comme patient avec un identifiant unique.
- `isPatientRegistered(address)` : Vérifie si une adresse wallet est enregistrée comme patient.
- `getPatientId(address)` : Récupère l'identifiant d'un patient à partir de son adresse wallet.
- `getPatientInfo(uint256)` : Récupère les informations de base d'un patient (adresse, date d'enregistrement, statut).

##### Gestion des consentements
- `selfGrantConsent(bytes32, bytes32, uint256)` : Permet à un patient d'accorder son consentement pour une étude spécifique avec une durée de validité.
- `revokeConsent(uint256)` : Permet à un patient de révoquer un consentement précédemment accordé.
- `isConsentValid(uint256)` : Vérifie si un consentement est valide (actif et non expiré).
- `getConsentDetails(uint256)` : Récupère les détails d'un consentement spécifique.
- `getPatientConsents(address)` : Récupère tous les consentements accordés par un patient.

##### Gestion des études
- `authorizeStudy(bytes32, string)` : Permet au propriétaire du contrat d'autoriser une nouvelle étude.
- `revokeStudyAuthorization(bytes32, string)` : Permet au propriétaire du contrat de révoquer l'autorisation d'une étude.
- `isStudyAuthorized(bytes32)` : Vérifie si une étude est autorisée.

##### Administration du contrat
- `pause()` : Permet au propriétaire de mettre en pause le contrat (arrête les nouvelles attributions de consentement).
- `unpause()` : Permet au propriétaire de réactiver le contrat après une pause.

## Cercle Token : points de fidélités

Token récompenseant les patients pour leurs contributions et engagement.
