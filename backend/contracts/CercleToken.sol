// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CercleToken is ERC20, Ownable, Pausable {
    // Mapping des adresses autorisées à mint seulement
    mapping(address => bool) public authorizedPatient;
    mapping(address => uint256) public monthlyMintedTokens;
    mapping(address => uint256) public lastMintMonth;
    mapping(string => Reward) public recompenses;

    uint256 public constant MONTHLY_MINT_LIMIT = 200; // 4 récompenses max/mois

    // Événements spécifiques
    event TokensBurned(address indexed from, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    event PatientAuthorizationChanged(address indexed minter, bool authorized);
    event RewardRedeemed(address indexed patient, uint256 tokensBurned, string redemptionCode, string rewardType);
    event DataDownloadRewarded(address indexed patient, bytes32 indexed datasetHash, uint256 amount);

    struct Reward {
        address patient;
        uint256 tokensBurned;
        string redemptionCode;
        uint256 timestamp;
        bool used;
    }
    
    error TransfersDisabled();
    error ApprovalsDisabled();
    error AllowanceDisabled();
    error NotAuthorizedPatient();
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error MonthlyMintLimitReached();

    constructor() ERC20("CercleToken", "CERCLE") Ownable(msg.sender) {}

    modifier onlyAuthorizedPatients() {
        if (!authorizedPatient[msg.sender]) revert NotAuthorizedPatient();
        _;
    }

    // Fonction spécifique au contexte médical
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

    // Les patients peuvent burn leurs propres tokens pour des récompenses
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
            block.timestamp,
            "-",
            uint256(uint160(msg.sender)),
            "-",
            tokenCost
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

    function transfer(address, uint256) public pure override returns (bool) {
        revert TransfersDisabled();
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert TransfersDisabled();
    }

    function approve(address, uint256) public pure override returns (bool) {
        revert ApprovalsDisabled();
    }

    function allowance(address, address) public pure override returns (uint256) {
        revert AllowanceDisabled();
    }

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

    function setAuthorizedPatient(address minter, bool authorized) external onlyOwner {
        if (minter == address(0)) revert InvalidAddress();
        authorizedPatient[minter] = authorized;
        emit PatientAuthorizationChanged(minter, authorized);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ VIEW FUNCTIONS ============

    function isSoulBound() external pure returns (bool) {
        return true;
    }

    function canTransfer() external pure returns (bool) {
        return false;
    }
}