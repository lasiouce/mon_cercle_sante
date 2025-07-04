// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CercleToken
 * @dev Token ERC20 Soul Bound pour l'écosystème médical Cercle
 * @notice Ce contrat implémente un token non-transférable (Soul Bound) utilisé pour récompenser
 *         les patients qui partagent leurs données médicales et permettre l'échange contre des récompenses
 * @author lasiouce (https://github.com/lasiouce)
 */
contract CercleToken is ERC20, Ownable, Pausable {
    /// @notice Mapping des adresses de patients autorisées à recevoir des récompenses
    mapping(address => bool) public authorizedPatient;
    
    /// @notice Nombre de tokens mintés par patient ce mois-ci
    mapping(address => uint256) public monthlyMintedTokens;
    
    /// @notice Dernier mois où le patient a reçu des tokens (pour reset mensuel)
    mapping(address => uint256) public lastMintMonth;
    
    /// @notice Mapping des codes de récompense vers les détails de récompense
    mapping(string => Reward) public recompenses;

    /// @notice Limite mensuelle de tokens qu'un patient peut recevoir (200 CERCLE = 4 téléchargements max/mois)
    uint256 public constant MONTHLY_MINT_LIMIT = 200;

    /**
     * @notice Émis quand des tokens sont brûlés par un patient
     * @param from Adresse du patient qui brûle les tokens
     * @param amount Nombre de tokens brûlés
     */
    event TokensBurned(address indexed from, uint256 amount);
    
    /**
     * @notice Émis quand des tokens sont mintés pour un patient
     * @param to Adresse du patient qui reçoit les tokens
     * @param amount Nombre de tokens mintés
     */
    event TokensMinted(address indexed to, uint256 amount);
    
    /**
     * @notice Émis quand l'autorisation d'un patient est modifiée
     * @param minter Adresse du patient
     * @param authorized Nouveau statut d'autorisation
     */
    event PatientAuthorizationChanged(address indexed minter, bool authorized);
    
    /**
     * @notice Émis quand un patient échange des tokens contre une récompense
     * @param patient Adresse du patient
     * @param tokensBurned Nombre de tokens brûlés
     * @param redemptionCode Code unique de rédemption généré
     * @param rewardType Type de récompense demandée
     */
    event RewardRedeemed(address indexed patient, uint256 tokensBurned, string redemptionCode, string rewardType);
    
    /**
     * @notice Émis quand un patient est récompensé pour un téléchargement de données
     * @param patient Adresse du patient récompensé
     * @param datasetHash Hash du dataset téléchargé
     * @param amount Nombre de tokens accordés
     */
    event DataDownloadRewarded(address indexed patient, bytes32 indexed datasetHash, uint256 amount);

    /**
     * @notice Structure représentant une récompense échangée
     * @param patient Adresse du patient qui a échangé
     * @param tokensBurned Nombre de tokens brûlés pour cette récompense
     * @param redemptionCode Code unique de rédemption
     * @param timestamp Timestamp de l'échange
     * @param used Indique si la récompense a été utilisée
     */
    struct Reward {
        address patient;
        uint256 tokensBurned;
        string redemptionCode;
        uint256 timestamp;
        bool used;
    }
    
    /// @notice Erreur levée quand une tentative de transfert est effectuée (Soul Bound Token)
    error TransfersDisabled();
    
    /// @notice Erreur levée quand une tentative d'approbation est effectuée (Soul Bound Token)
    error ApprovalsDisabled();
    
    /// @notice Erreur levée quand une tentative de consultation d'allowance est effectuée
    error AllowanceDisabled();
    
    /// @notice Erreur levée quand un utilisateur non autorisé tente d'effectuer une action réservée aux patients
    error NotAuthorizedPatient();
    
    /// @notice Erreur levée quand une adresse invalide (address(0)) est fournie
    error InvalidAddress();
    
    /// @notice Erreur levée quand un montant invalide est fourni
    error InvalidAmount();
    
    /// @notice Erreur levée quand le solde est insuffisant pour une opération
    error InsufficientBalance();
    
    /// @notice Erreur levée quand la limite mensuelle de mint est atteinte
    error MonthlyMintLimitReached();

    /**
     * @notice Constructeur du contrat CercleToken
     * @dev Initialise le token ERC20 avec le nom "CercleToken" et le symbole "CERCLE"
     */
    constructor() ERC20("CercleToken", "CERCLE") Ownable(msg.sender) {}

    /**
     * @notice Modificateur pour restreindre l'accès aux patients autorisés uniquement
     * @dev Vérifie que msg.sender est dans le mapping authorizedPatient
     */
    modifier onlyAuthorizedPatients() {
        if (!authorizedPatient[msg.sender]) revert NotAuthorizedPatient();
        _;
    }

    /**
     * @notice Récompense un patient pour le téléchargement de ses données médicales
     * @dev Minte 50 CERCLE tokens en respectant la limite mensuelle de 200 CERCLE
     * @param patient Adresse du patient à récompenser
     * @param datasetHash Hash unique du dataset téléchargé
     * @custom:security Seuls les patients autorisés peuvent appeler cette fonction
     * @custom:limit Limite de 200 CERCLE par mois par patient (reset automatique)
     */
    function rewardForDataDownload(address patient, bytes32 datasetHash) 
        external 
        onlyAuthorizedPatients 
        whenNotPaused 
    {
        uint256 rewardAmount = 50; // 50 CERCLE par téléchargement
        
        // Vérification limite mensuelle
        uint256 currentMonth = block.timestamp / 30 days;
        if (lastMintMonth[patient] != currentMonth) {
            monthlyMintedTokens[patient] = 0;
            lastMintMonth[patient] = currentMonth;
        }
        
        if (monthlyMintedTokens[patient] + rewardAmount > MONTHLY_MINT_LIMIT) {
            revert MonthlyMintLimitReached();
        }
        
        monthlyMintedTokens[patient] += rewardAmount;
        _mint(patient, rewardAmount);
        emit TokensMinted(patient, rewardAmount);
        emit DataDownloadRewarded(patient, datasetHash, rewardAmount);
    }

    /**
     * @notice Permet à un patient d'échanger ses tokens contre une récompense
     * @dev Brûle les tokens du patient et génère un code de rédemption unique
     * @param tokenCost Nombre de tokens à brûler pour la récompense
     * @param rewardType Type de récompense demandée (description libre)
     * @return redemptionCode Code unique généré pour récupérer la récompense
     * @custom:security Seuls les patients autorisés peuvent échanger leurs tokens
     * @custom:requirement Le patient doit avoir suffisamment de tokens
     */
    function redeemReward(uint256 tokenCost, string calldata rewardType) 
        external 
        onlyAuthorizedPatients
        whenNotPaused
        returns (string memory redemptionCode) 
    {
        if (balanceOf(msg.sender) < tokenCost) revert InsufficientBalance();
        
        _burn(msg.sender, tokenCost);
        
        // Génération code unique
        redemptionCode = string(abi.encodePacked(
            "CERCLE-",
            Strings.toString(block.timestamp),
            "-",
            Strings.toString(uint256(uint160(msg.sender))),
            "-",
            Strings.toString(tokenCost)
        ));
        
        recompenses[redemptionCode] = Reward({
            patient: msg.sender,
            tokensBurned: tokenCost,
            redemptionCode: redemptionCode,
            timestamp: block.timestamp,
            used: false
        });
        
        emit TokensBurned(msg.sender, tokenCost);
        emit RewardRedeemed(msg.sender, tokenCost, redemptionCode, rewardType);
    }

    // ============ SOUL BOUND IMPLEMENTATION ============

    /**
     * @notice Fonction de transfert désactivée (Soul Bound Token)
     * @dev Toujours revert car les tokens ne peuvent pas être transférés
     * @return Jamais de retour, toujours revert
     */
    function transfer(address, uint256) public pure override returns (bool) {
        revert TransfersDisabled();
    }

    /**
     * @notice Fonction de transfert depuis une autre adresse désactivée (Soul Bound Token)
     * @dev Toujours revert car les tokens ne peuvent pas être transférés
     * @return Jamais de retour, toujours revert
     */
    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert TransfersDisabled();
    }

    /**
     * @notice Fonction d'approbation désactivée (Soul Bound Token)
     * @dev Toujours revert car les approbations ne sont pas nécessaires
     * @return Jamais de retour, toujours revert
     */
    function approve(address, uint256) public pure override returns (bool) {
        revert ApprovalsDisabled();
    }

    /**
     * @notice Fonction de consultation d'allowance désactivée (Soul Bound Token)
     * @dev Toujours revert car les allowances ne sont pas supportées
     * @return Jamais de retour, toujours revert
     */
    function allowance(address, address) public pure override returns (uint256) {
        revert AllowanceDisabled();
    }

    /**
     * @notice Override de la fonction _update pour implémenter le comportement Soul Bound
     * @dev Permet uniquement le mint (from == address(0)) et le burn (to == address(0))
     * @param from Adresse source (address(0) pour mint)
     * @param to Adresse destination (address(0) pour burn)
     * @param value Montant à transférer
     */
    function _update(address from, address to, uint256 value) internal override {
        // Permettre le mint (from == address(0)) et le burn (to == address(0))
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        // Bloquer tous les autres transferts (Soul Bound Token)
        revert TransfersDisabled();
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Autorise ou révoque l'autorisation d'un patient
     * @dev Seul le propriétaire peut modifier les autorisations
     * @param minter Adresse du patient à autoriser/révoquer
     * @param authorized True pour autoriser, false pour révoquer
     * @custom:security Fonction réservée au propriétaire du contrat
     */
    function setAuthorizedPatient(address minter, bool authorized) external onlyOwner {
        if (minter == address(0)) revert InvalidAddress();
        authorizedPatient[minter] = authorized;
        emit PatientAuthorizationChanged(minter, authorized);
    }

    /**
     * @notice Met en pause le contrat
     * @dev Empêche l'exécution des fonctions avec le modificateur whenNotPaused
     * @custom:security Fonction réservée au propriétaire du contrat
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Retire la pause du contrat
     * @dev Permet à nouveau l'exécution des fonctions avec le modificateur whenNotPaused
     * @custom:security Fonction réservée au propriétaire du contrat
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Indique si le token est Soul Bound (non-transférable)
     * @dev Fonction pure qui retourne toujours true
     * @return bool True car ce token est Soul Bound
     */
    function isSoulBound() external pure returns (bool) {
        return true;
    }

    /**
     * @notice Indique si les transferts sont autorisés
     * @dev Fonction pure qui retourne toujours false
     * @return bool False car les transferts sont désactivés
     */
    function canTransfer() external pure returns (bool) {
        return false;
    }
}