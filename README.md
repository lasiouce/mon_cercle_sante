# Mon Cercle Sante
## Table des matières
* [Présentation](#présentation)
* [Economie circulaire CercleToken](#economie-circulaire-de-cercletoken)
* [Diagramme de séquence](#diagramme-de-séquence)
* [Gestion de consentements médicaux](#medicalconsent)
* [Génération et gestion des points fidélités](#cercle-token--points-de-fidélités)

## Présentation

Cette application a pour but de permettre à des patients de charger des données médicales et de les partager avec des chercheurs afin de participer à des recherches sur le diabète, tout en garantissant leur confidentialité et leur protection.

Le contrat `MedicalConsent` est un contrat de gestion de consentements médicaux basé sur les NFTs (ERC721) en mixant le concetp de Soul Bound Token (token ayant un unique propriétaire, sans possibilité de transfert). Il permet au patient d'accorder et de révoquer (burn du token) leur consentement pour l'utilisation de leurs données médicales dans des études spécifiques.

Le contrat `CercleToken` est un contrat de création de points de fidélités basé sur l'ERC20, il implémente aussi le concept de SBT (Soul Bound Tokens). Il permet au patient d'obtenir des points de fidélités pour chaque téléchargement de données par les chercheurs. Ces points ont de multiples cas d'usages dans l'application (accès réduction panier repas,fitness, dispositifs ) ce système de gestion de points est implémenté dans le contrat `CercleTokenRewards`.

## Economie circulaire de CercleToken :
to do: 
* clarifié régle anti abus (limitations annuel, mensuel) ne pas bloqué l'upload mais plus de mint de token.
* proposition d'offre gratuite:
      - lié à l'éducation (interview chercheur, responsable de recherche, article blockchain; article diabètique)
      - retour lié aux études qui donne un résultat vulgarisé au patient ( vos donnée ont améliorer un modèle de mesure de glycémie)
      - recette adapté aux diabètique 
* gamification badge (par rank bronze, or, argent) et défi de régularité qui donne bonus token ( 12 mois donne 200 token)

```mermaid
graph TD
    A[📊 Patient Upload Données] --> B[🔬 Téléchargement par Chercheur]
    
    B --> C{Anti-abus OK?}
    C -->|✅ Première fois| D[🪙 MINT +50 Tokens SBT]
    C -->|❌ Déjà récompensé| X[❌ Aucun token]
    
    D --> E[💰 Solde Patient: +50 CercleTokens]
    
    E --> F[🛒 Catalogue Récompenses]
    F --> G{Sélection récompense}
    
    G -->|🏥 Pharmacie| H1[🔥 BURN 200 Tokens]
    G -->|🥗 Nutrition| H2[🔥 BURN 150 Tokens]
    G -->|💪 Fitness| H3[🔥 BURN 100 Tokens]
    G -->|📚 Éducation| H4[🔥 BURN 75 Tokens]
    
    H1 --> I1[💰 Nouveau Solde: -200T]
    H2 --> I2[💰 Nouveau Solde: -150T]
    H3 --> I3[💰 Nouveau Solde: -100T]
    H4 --> I4[💰 Nouveau Solde: -75T]
    
    I1 --> J1[🎁 Code Dispositifs Glycémie]
    I2 --> J2[🎁 Code Produits IG Bas]
    I3 --> J3[🎁 Code Abonnement Sport]
    I4 --> J4[🎁 Code Consultation]
    
    J1 --> K[🏥 Amélioration Santé Patient]
    J2 --> K
    J3 --> K
    J4 --> K
    
    K --> L[📈 Plus d'Engagement Patient]
    L --> M[📊 Plus de Données Partagées]
    M --> A
    
    %% Styles avec couleurs foncées pour texte blanc
    style D fill:#2E7D32,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style E fill:#4A148C,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H1 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H2 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H3 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H4 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style I1 fill:#87CEEB,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style I2 fill:#87CEEB,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style I3 fill:#87CEEB,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style I4 fill:#87CEEB,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J1 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J2 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J3 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J4 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    
    classDef tokenFlow fill:#4682B4,stroke:#000080,stroke-width:1px,color:#FFFFFF
    class A,B,C,F,G,K,L,M,X tokenFlow
```

## Diagramme de séquence :

```mermaid
sequenceDiagram
    participant P as Patient
    participant R as Researcher
    participant PS as Partner System
    participant F as Frontend / API
    participant BC as Blockchain<br/>(MedicalConsent + LoyaltyProgram)
    participant DB as OVH - PostgreSQL
        
    Note over P,DB: 📤 PHASE 1: Upload des données et consentement
    
    P->>F: Saisit pseudonyme/email
    F->>BC: registerPatient()
    BC-->>F: Retourne patientId
    F->>DB: Save patient infos (patientId from blockchain)
    DB-->>F: Retourne patientId
    P->>F: Upload données glycémiques
    F->>DB: Stocke données + génère datasetHash
    DB-->>F: Retourne datasetHash
    F->>BC: call mint NFT - selfGrantConsent(datasetHash, studyId, validUntil)
    BC-->>F: Event: ConsentGrantedAndDatasetRegistered(patientId, datasetHash, studyId)
    
    Note over P,DB: 🔬 PHASE 2: Téléchargement par chercheur
    R->>F: Authentification chercheur
    F->>BC: Vérifie autorisation chercheur pour studyId
    BC-->>F: Confirme autorisation
    R->>BC: downloadDataset(consentId, datasetHash)
    alt Consentement valide
        BC-->>F: Autorise l'accès aux données
    else Consentement invalide/expiré
        BC-->>F: Erreur: Accès refusé
        F-->>R: Notification: Consentement invalide
    end
    F-->>R: Notification: Consentement accordé
    BC-->>F: Autorise l'accès aux données
    F -->> R: Notif download
    R->>F: Demande téléchargement dataset
    F->>DB: Récupère données (datasetHash)
    DB-->>F: Retourne données
    F-->>R: Fournit dataset
    BC-->>F: Émet DatasetDownloaded event
 
    Note over P,DB: 🎁 PHASE 3: Système de récompenses automatique

    BC->>BC: Écoute DatasetDownloaded event
    alt Limites respectées
        BC->>BC: awardTokensForDownload()
    else Limites dépassées // Déja récompensé // Anti-abus
        BC-->>F: Event: RewardLimitExceeded(patientId)
    end
    BC->>BC: awardTokensForDownload(patientId, datasetHash)
    BC->>BC: mint(patientAddress, rewardAmount) via SBT
    BC-->>F: Émet TokensAwarded event (patientId, patientAddress, datasetHash, tokensAwarded)  
    F-->>P: Notification: "Vous avez reçu X tokens!"
    
    Note over P,DB: 🛍️ PHASE 4: Utilisation des récompenses (Burn)
    
    P->>F: Consulte catalogue des avantages
    F->>P: Sélectionne offre (ex: 200 tokens → 20% réduction panier repas)
    F->>BC: redeemReward(rewardId, patientAddress)
    BC->>BC: Vérifie solde suffisant
    BC->>BC: burn(patientAddress, tokenCost) via SBT
    BC->>BC: Génère code de réduction unique
    BC-->>F: Retourne code réduction partenaire
    BC-->>F: event - RewardRedeemed(patientAddress, rewardId, tokensBurned, redemptionCode)
    F ->> DB: Stocke code réductions non utilisé
    F->>PS: Envoie code de réduction au partenaire
    PS-->>F: Confirme réception du code
    F-->>P: Affiche code de réduction + instructions
    
    Note over P,DB: 🏪 PHASE 5: Utilisation chez le partenaire
    
    P->>PS: Présente code de réduction
    PS->>PS: Valide code + applique réduction
    PS->>F: Confirme utilisation du code
    F->>DB: Marque code réduction utilisé
```

### MedicalConsent

#### Gestion des patients
- `registerPatient()` : Permet à un utilisateur de s'enregistrer comme patient avec un identifiant unique.
- `isPatientRegistered(address)` : Vérifie si une adresse wallet est enregistrée comme patient.
- `getPatientId(address)` : Récupère l'identifiant d'un patient à partir de son adresse wallet.
- `getPatientInfo(uint256)` : Récupère les informations de base d'un patient (adresse, date d'enregistrement, statut).

#### Gestion des consentements
- `selfGrantConsent(bytes32, bytes32, uint256)` : Permet à un patient d'accorder son consentement pour une étude spécifique avec une durée de validité.
- `revokeConsent(uint256)` : Permet à un patient de révoquer un consentement précédemment accordé.
- `isConsentValid(uint256)` : Vérifie si un consentement est valide (actif et non expiré).
- `getConsentDetails(uint256)` : Récupère les détails d'un consentement spécifique.
- `getPatientConsents(address)` : Récupère tous les consentements accordés par un patient.

#### Gestion des études
- `authorizeStudy(bytes32, string)` : Permet au propriétaire du contrat d'autoriser une nouvelle étude.
- `revokeStudyAuthorization(bytes32, string)` : Permet au propriétaire du contrat de révoquer l'autorisation d'une étude.
- `isStudyAuthorized(bytes32)` : Vérifie si une étude est autorisée.

#### Administration du contrat
- `pause()` : Permet au propriétaire de mettre en pause le contrat (arrête les nouvelles attributions de consentement).
- `unpause()` : Permet au propriétaire de réactiver le contrat après une pause.

## Cercle Token : points de fidélités

Token récompenseant les patients pour leurs contributions et engagement.
