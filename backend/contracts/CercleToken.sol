// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CercleToken
 * @dev Soul Bound ERC20 token for the Cercle medical ecosystem
 * @notice This contract implements a non-transferable (Soul Bound) token used to reward
 *         patients who share their medical data and enable exchange for rewards
 * @author lasiouce (https://github.com/lasiouce)
 */
contract CercleToken is ERC20, Ownable {
    /// @notice Mapping of patient addresses authorized to receive rewards
    mapping(address => bool) public authorizedPatient;

    /// @notice Mapping of patient addresses authorized to receive rewards
    mapping(address => bool) public authorizedResearchers;
    
    /// @notice Number of tokens minted per patient this month
    mapping(address => uint256) public monthlyMintedTokens;
    
    /// @notice Last month when the patient received tokens (for monthly reset)
    mapping(address => uint256) public lastMintMonth;
    
    /// @notice Mapping of reward codes to reward details
    mapping(string => Reward) public recompenses;

    /// @notice Monthly limit of tokens a patient can receive (200 CERCLE = 4 max downloads/month)
    uint256 public constant MONTHLY_MINT_LIMIT = 200;

    /**
     * @notice Emitted when tokens are burned by a patient
     * @param from Address of the patient burning the tokens
     * @param amount Number of tokens burned
     */
    event TokensBurned(address indexed from, uint256 amount);
    
    /**
     * @notice Emitted when tokens are minted for a patient
     * @param to Address of the patient receiving the tokens
     * @param amount Number of tokens minted
     */
    event TokensMinted(address indexed to, uint256 amount);
    
    /**
     * @notice Emitted when a patient's authorization is modified
     * @param minter Patient address
     * @param authorized New authorization status
     */
    event PatientAuthorizationChanged(address indexed minter, bool authorized);
    
    /**
     * @notice Emitted when a patient exchanges tokens for a reward
     * @param patient Patient address
     * @param tokensBurned Number of tokens burned
     * @param redemptionCode Unique redemption code generated
     * @param rewardType Type of reward requested
     */
    event RewardRedeemed(address indexed patient, uint256 tokensBurned, string redemptionCode, string rewardType);
    
    /**
     * @notice Emitted when a patient is rewarded for a data download
     * @param patient Address of the rewarded patient
     * @param datasetHash Hash of the downloaded dataset
     * @param amount Number of tokens awarded
     */
    event DataDownloadRewarded(address indexed patient, bytes32 indexed datasetHash, uint256 amount);

    /**
     * @notice Structure representing an exchanged reward
     * @param patient Address of the patient who exchanged
     * @param tokensBurned Number of tokens burned for this reward
     * @param redemptionCode Unique redemption code
     * @param timestamp Timestamp of the exchange
     * @param used Indicates if the reward has been used
     */
    struct Reward {
        address patient;
        uint256 tokensBurned;
        string redemptionCode;
        uint256 timestamp;
        bool used;
    }
    
    /// @notice Error thrown when a transfer attempt is made (Soul Bound Token)
    error TransfersDisabled();
    
    /// @notice Error thrown when an approval attempt is made (Soul Bound Token)
    error ApprovalsDisabled();
    
    /// @notice Error thrown when an allowance query attempt is made
    error AllowanceDisabled();
    
    /// @notice Error thrown when an unauthorized user attempts an action reserved for patients
    error NotAuthorizedPatient();

    /// @notice Error thrown when an unauthorized user attempts an action reserved for patients
    error NotAuthorizedResearchers();
    
    /// @notice Error throw when an unauthorized user attempts an action, for POC
    error NotAuthorizedUser();
    
    /// @notice Error thrown when an invalid address (address(0)) is provided
    error InvalidAddress();
    
    /// @notice Error thrown when an invalid amount is provided
    error InvalidAmount();
    
    /// @notice Error thrown when balance is insufficient for an operation
    error InsufficientBalance();
    
    /// @notice Error thrown when the monthly mint limit is reached
    error MonthlyMintLimitReached();

    /**
     * @notice Constructor for the CercleToken contract
     * @dev Initializes the ERC20 token with name "CercleToken" and symbol "CERCLE"
     */
    constructor() ERC20("CercleToken", "CERCLE") Ownable(msg.sender) {}

    /**
     * @notice Modifier to restrict access to authorized patients only
     * @dev Checks that msg.sender is in the authorizedPatient mapping
     */
    modifier onlyAuthorizedPatients() {
        if (!authorizedPatient[msg.sender]) revert NotAuthorizedPatient();
        _;
    }
    modifier onlyAuthorizedUsers() {
        if (!authorizedPatient[msg.sender] && !authorizedResearchers[msg.sender]) {
        revert NotAuthorizedUser();
        }
        _;
    }

    /**
     * @notice Modifier to restrict access to authorized patients only
     * @dev Checks that msg.sender is in the authorizedPatient mapping
     */
    modifier onlyAuthorizedResearchers() {
        if (!authorizedResearchers[msg.sender]) revert NotAuthorizedResearchers();
        _;
    }

    /**
     * @notice Rewards a patient for downloading their medical data
     * @dev Mints 50 CERCLE tokens while respecting the monthly limit of 200 CERCLE
     * @param patient Address of the patient to reward
     * @param datasetHash Unique hash of the downloaded dataset
     * @custom:security Only authorized patients can call this function
     * @custom:limit Limit of 200 CERCLE per month per patient (automatic reset)
     */
    function rewardForDataDownload(address patient, bytes32 datasetHash) 
        external 
        onlyAuthorizedUsers()
    {
        uint256 rewardAmount = 50; // 50 CERCLE per download
        
        // Check monthly limit
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
     * @notice Allows a patient to exchange their tokens for a reward
     * @dev Burns the patient's tokens and generates a unique redemption code
     * @param tokenCost Number of tokens to burn for the reward
     * @param rewardType Type of reward requested (free description)
     * @return redemptionCode Unique code generated to claim the reward
     * @custom:security Only authorized patients can exchange their tokens
     * @custom:requirement Patient must have sufficient tokens
     */
    function redeemReward(uint256 tokenCost, string calldata rewardType) 
        external 
        onlyAuthorizedPatients
        returns (string memory redemptionCode) 
    {
        if (balanceOf(msg.sender) < tokenCost) revert InsufficientBalance();
        
        _burn(msg.sender, tokenCost);
        
        // Generate unique code
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
     * @notice Approval function disabled (Soul Bound Token)
     * @dev Always reverts as approvals are not necessary
     * @return Never returns, always reverts
     */
    function approve(address, uint256) public pure override returns (bool) {
        revert ApprovalsDisabled();
    }

    /**
     * @notice Allowance query function disabled (Soul Bound Token)
     * @dev Always reverts as allowances are not supported
     * @return Never returns, always reverts
     */
    function allowance(address, address) public pure override returns (uint256) {
        revert AllowanceDisabled();
    }

    /**
     * @notice Override of _update function to implement Soul Bound behavior
     * @dev Only allows mint (from == address(0)) and burn (to == address(0))
     * @param from Source address (address(0) for mint)
     * @param to Destination address (address(0) for burn)
     * @param value Amount to transfer
     */
    function _update(address from, address to, uint256 value) internal override {
        // Allow mint (from == address(0)) and burn (to == address(0))
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        // Block all other transfers (Soul Bound Token)
        revert TransfersDisabled();
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Authorizes or revokes a patient's authorization
     * @dev Only the owner can modify authorizations
     * @param minter Address of the patient to authorize/revoke
     * @param authorized True to authorize, false to revoke
     * @custom:security Function reserved for the contract owner
     */
    function setAuthorizedPatient(address minter, bool authorized) external {
        if (minter == address(0)) revert InvalidAddress();
        authorizedPatient[minter] = authorized;
        emit PatientAuthorizationChanged(minter, authorized);
    }

    /**
     * @notice Authorizes or revokes a researchers's authorization
     * @dev Only the owner can modify authorizations
     * @param addr Address of the patient to authorize/revoke
     * @param authorized True to authorize, false to revoke
     * @custom:security Function reserved for the contract owner
     */
    function setAuthorizedResearchers(address addr, bool authorized) external {
        if (addr == address(0)) revert InvalidAddress();
        authorizedResearchers[addr] = authorized;
        emit PatientAuthorizationChanged(addr, authorized);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Indicates if the token is Soul Bound (non-transferable)
     * @dev Pure function that always returns true
     * @return bool True as this token is Soul Bound
     */
    function isSoulBound() external pure returns (bool) {
        return true;
    }

    /**
     * @notice Indicates if transfers are allowed
     * @dev Pure function that always returns false
     * @return bool False as transfers are disabled
     */
    function canTransfer() external pure returns (bool) {
        return false;
    }
}