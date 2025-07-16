# Mon Cercle Sante
## Table des matières
* [Présentation](#présentation)
* [Roadmap ](#roadmap-et-améliorations-futures)
* [Sécurité ](#sécurité-et-mécanismes-anti-abus)
* [Consentement de partage de donnée](#consentement-de-partage-de-donnée)
* [CercleToken](#cercle-token--points-de-fidélités)
* [Economie circulaire CercleToken](#economie-circulaire-de-cercletoken)
* [Diagramme de séquence](#diagramme-de-séquence)

## Présentation

Cette application a pour but de permettre à des patients de charger des données médicales et de les partager avec des chercheurs afin de participer à des recherches sur le diabète, tout en garantissant leur confidentialité et leur protection. L'application vise à proposer du contenu éducatif, des interactions communautaires ainsi que des réductions sur des produits favorisant la prévention du diabète.

Le contrat [CercleConsent](backend/contracts/CercleConsent.sol) est un contrat de gestion de consentements médicaux basé sur les NFTs (ERC721) en mixant le concept de Soul Bound Token (token ayant un unique propriétaire, sans possibilité de transfert). Il permet au patient d'accorder et de révoquer leur consentement pour l'utilisation de leurs données médicales dans des études spécifiques.

Le contrat [CercleToken](backend/contracts/CercleToken.sol) est un contrat de création de points de fidélité basé sur l'ERC20, il implémente aussi le concept de SBT (Soul Bound Tokens). Ces points de fidélité sont appelés par la suite `CERCLE`. Un montant de CercleToken est créé sur le compte du patient pour chaque téléchargement de données par les chercheurs. Ils ont de multiples cas d'usages dans l'application (accès réduction panier repas, fitness, dispositifs pharmaceutiques, etc.).
Le système de récompenses automatique est basé sur la limite mensuelle de 200 CERCLE par patient. Chaque téléchargement de données génère 50 CERCLE. Si un patient atteint cette limite, il ne recevra plus de tokens. Cependant, il peut continuer à partager ses données sans être limité.

## Roadmap et améliorations futures

### Phase 1 - MVP (En cours)
- ✅ Smart contracts Consentement et CercleToken
- ✅ API backend et base de données
- ✅ Interface utilisateur 


### Phase 2 - Sécurité & Gamification

-  Refacto système autorisation (dashboard admin ?)
-  Rôle médecin oriente patient vers étude, chercheur, labo (dashboard: nb patientel, % patientel partageant données, programme recherche avec % de participation)
-  Rôle labo, publication étude, chercheur  
-  Sécurisé route en fonction des rôles
-  Amélioration table pour chercheur
- 🔮 Système de badges (Bronze, Argent, Or)
- 🔮 Défis de régularité :
    - 12 mois consécutifs = +200 CERCLE
    - 6 mois consécutifs = +100 CERCLE
    - 3 mois consécutifs = +50 CERCLE
- 🔮 Niveaux de contributeur avec avantages progressifs

### Phase 3 - Écosystème étendu
- 🔮 Intégration avec des partenaires de recherche.
- 🔮 Contenu blog éducatif (interview chercheur, responsable de recherche, article blockchain, article diabète)
- 🔮 Retours d'études vulgarisés et personnel pour les patients (ex :  "Vos données ont amélioré un modèle de mesure de glycémie", etc.)
- 🔮 Contenu recettes de cuisine indice glycémique bas. 
- 🔮 Groupes locaux de patients (les contributeurs se rencontrent - cf groupe de parole -, peuvent échanger entre eux et avec les chercheurs, co animation des groupes locaux avec les CHUs locaux ?) > Ce sera l'occasion d'identifier des besoins spécifiques à ce type de patients, de faire remonter les besoins, échanger sur les bonnes pratiques entre les groupes, d'ajuster la gamification / les badges ...)
- 🔮 Partenariats avec CHU locaux

## Sécurité et mécanismes anti-abus

### Identité protégée
- **RGPD** : Respect de la réglementation en matière de protection des données personnelles
- **Base de donnée HDS** : Stockage sécurisé et anonymisé des données
- **Sécurité des données** : Seul un hash de référence vers une base de donnée est stocké sur la blockchain, ce qui garantit la confidentialité des données. 

### Limitations des récompenses
- **Limite mensuelle** : 200 CERCLE maximum par patient par mois
- **Calcul mensuel** : Basé sur `block.timestamp / 30 days`
- **Reset automatique** : Les compteurs se remettent à zéro chaque nouveau mois
- **Pas de blocage d'upload** : Les patients peuvent continuer à partager des données même après avoir atteint la limite

### Soul Bound Tokens (SBT)
- **CercleToken** : Impossible de transférer les tokens entre comptes
- **CercleConsent** : Impossible de transférer les NFT de consentement
- **Objectif** : Éviter la spéculation et garantir que les récompenses restent liées au patient contributeur

### Contrôles d'accès
- **Patients autorisés** : Seuls les patients enregistrés peuvent recevoir des récompenses
- **Études autorisées** : Seules les études validées par l'administrateur peuvent collecter des consentements
- **Pause d'urgence** : Possibilité de suspendre les contrats en cas de problème

## Consentement de partage de donnée

### Gestion des patients
- `registerPatient()` : Permet à un utilisateur de s'enregistrer comme patient avec un identifiant unique.
- `isPatientRegistered(address)` : Vérifie si une adresse wallet est enregistrée comme patient.
- `getPatientId(address)` : Récupère l'identifiant d'un patient à partir de son adresse wallet.
- `getPatientInfo(uint256)` : Récupère les informations de base d'un patient (adresse, date d'enregistrement, statut).

### Gestion des consentements
- `selfGrantConsent(bytes32, bytes32, uint256)` : Permet à un patient d'accorder son consentement pour une étude spécifique avec une durée de validité.
- `revokeConsent(uint256 consentId, uint256 patientId)` : Permet à un patient de révoquer un consentement précédemment accordé.
- `isConsentValid(uint256 tokenId, uint256 patientId)` : Vérifie si un consentement est valide (actif et non expiré).
- `getConsentDetails(uint256 tokenId, uint256 patientId)` : Récupère les détails d'un consentement spécifique.
- `getPatientConsents(uint256 patientId)` : Récupère tous les consentements accordés par un patient.
- `getPatientConsentCount(uint256 patientId)` : Récupère le nombre de consentements d'un patient.
- `totalSupply()` : Récupère le nombre total de consentements actifs.

### Gestion des études
- `authorizeStudy(bytes32, string)` : Permet au propriétaire du contrat d'autoriser une nouvelle étude.
- `revokeStudyAuthorization(bytes32, string)` : Permet au propriétaire du contrat de révoquer l'autorisation d'une étude.
- `isStudyAuthorized(bytes32)` : Vérifie si une étude est autorisée.

### Administration du contrat
- `pause()` : Permet au propriétaire de mettre en pause le contrat (arrête les nouvelles attributions de consentement).
- `unpause()` : Permet au propriétaire de réactiver le contrat après une pause.

## Cercle Token : points de fidélités

### Récompenses automatiques
- `rewardForDataDownload(address patient, bytes32 datasetHash)` : Attribue 50 CERCLE pour un téléchargement de données.
- `MONTHLY_MINT_LIMIT` : Constante fixée à 200 CERCLE par mois.

### Échange de récompenses
- `redeemReward(uint256 tokenCost, string rewardType)` : Permet d'échanger des tokens contre des récompenses.

### Administration
- `setAuthorizedPatient(address patient, bool authorized)` : Autorise un patient à recevoir des récompenses.
- `pause()` / `unpause()` : Contrôle de l'état du contrat.

### Propriétés Soul Bound Token
- `isSoulBound()` : Retourne `true` (les tokens ne peuvent pas être transférés).
- `canTransfer()` : Retourne `false` (les transferts sont interdits).

### Economie circulaire de CercleToken

```mermaid
graph TD
A[📊 Patient Upload Données] --> B[🔬 Téléchargement par Chercheur]

B --> N{Veut participer au système de récompense?}
N -->|✅ Oui| C{Limite récompenses respectée ? 200 CERCLE/mois = 4 uploads}
N -->|❌ Non| X[❌ Pas de génération de CERCLE]

C -->|✅ Oui| D[🪙 MINT +50 CERCLE]
C -->|❌ Non| X

D --> E[💰 Solde Patient: +50 CERCLE]

E --> F[🛒 Catalogue Récompenses]
F --> G{Sélection récompense}

G -->|🏥 Pharmacie| H1[🔥 BURN 200 CERCLE]
G -->|🥗 Nutrition| H2[🔥 BURN 150 CERCLE]
G -->|💪 Fitness| H3[🔥 BURN 500 CERCLE]
G -->|📚 Éducation| H4[Contenu gratuit]
G --> |🗫 Communauté| H5[Contenu gratuit]

H1 --> I1[💰 Nouveau Solde: -200 CERCLE]
H2 --> I2[💰 Nouveau Solde: -150 CERCLE]
H3 --> I3[💰 Nouveau Solde: -500 CERCLE]


I1 --> J1[🎁 Bon dispositifs contrôle glycémie]
I2 --> J2[🎁 Bon produits indice glycémique bas]
I3 --> J3[🎁 Bon abonnement sport]
H4 --> J4[🎁 Accès interview chercheur et blog éducatif]
H5 --> J5[🎁 Accès à des forums patients/chercheurs et groupes d'échanges locaux]

J1 --> K[🏥 Amélioration Santé Patient]
J2 --> K
J3 --> K
J4 --> K
J5 --> K

K --> L[📈 Plus d'Engagement Patient]
L --> M[📊 Plus de Données Partagées]
M --> A

%% Styles avec couleurs foncées pour texte blancAdd commentMore actions
    style D fill:#2E7D32,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style E fill:#4A148C,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H1 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H2 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H3 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H4 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style H5 fill:#B0C4DE,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style I1 fill:#87CEEB,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style I2 fill:#87CEEB,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style I3 fill:#87CEEB,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J1 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J2 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J3 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J4 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    style J5 fill:#00BFFF,stroke:#000080,stroke-width:1px,color:#FFFFFF
    
    classDef tokenFlow fill:#4682B4,stroke:#000080,stroke-width:1px,color:#FFFFFF
    class A,B,C,F,G,K,L,M,N,X tokenFlow
```

## Diagramme de séquence

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

## FAQ

**Q: Que se passe-t-il si j'atteins la limite mensuelle de 200 CERCLE ?**
R: Vous pouvez continuer à partager vos données, mais vous ne recevrez plus de nouveaux tokens jusqu'au mois suivant.

**Q: Puis-je transférer mes CERCLE à un autre patient ?**
R: Non, les CERCLE sont des Soul Bound Tokens liés à votre compte uniquement.

**Q: Comment puis-je révoquer mon consentement ?**
R: Vous pouvez révoquer votre consentement à tout moment via l'interface, ce qui rendra indisponible de vos données pour les études liées. L'application est conforme à la RGPD.

**Q: Les données sont-elles anonymisées ?**
R: Oui, seul un hash de la référence des données est stocké sur la blockchain. Les données personnelles et médicales sont stockées de manière sécurisée et anonymisée chez un hébergeur certifié HDS (Hébergeur de Données de Santé).
