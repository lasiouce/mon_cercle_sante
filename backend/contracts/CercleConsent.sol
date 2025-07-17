// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title CercleConsent NFT Contract
 * @dev Soul Bound ERC721 token for managing medical consent in the Cercle ecosystem
 * @notice This contract manages medical consent as non-transferable NFTs for patients 
 *         participating in medical studies. Each consent is represented as a unique NFT
 *         that cannot be transferred, ensuring the integrity of consent management.
 * @author lasiouce (https://github.com/lasiouce)
 * @custom:version 1.0.0
 * @custom:security-contact security@cercle.health
 */
contract CercleConsent is ERC721 {
    
    // ============ STRUCTS ============
    
    /**
     * @notice Structure to store comprehensive consent data
     * @dev Contains all relevant information about a specific medical consent
     * @param consentId Unique identifier for the consent (also serves as NFT token ID)
     * @param datasetHash Cryptographic hash of the dataset the consent applies to
     * @param studyId Identifier of the medical study for which consent is granted
     * @param validUntil Unix timestamp until which the consent remains valid
     * @param createdAt Unix timestamp when the consent was initially created
     * @param revokedAt Unix timestamp when the consent was revoked (0 if not revoked)
     * @param isActive Boolean flag indicating if the consent is currently active and valid
     */
    struct ConsentData {
        uint256 consentId;
        bytes32 datasetHash;
        uint256 studyId;
        uint256 validUntil;
        uint256 createdAt;
        uint256 revokedAt;
        bool isActive;
    }

    /**
     * @notice Structure to efficiently manage consents by study
     * @dev Optimized data structure for O(1) operations on study-specific consent queries
     * @param activeConsents Mapping from consent ID to active status for quick lookups
     * @param consentIds Array of all consent IDs for iteration purposes
     * @param activeCount Counter of currently active consents for O(1) count queries
     */
    struct StudyConsents {
        mapping(uint256 => bool) activeConsents;
        uint256[] consentIds;
        uint256 activeCount;
    }

    /**
     * @notice Structure to store comprehensive patient information
     * @dev Contains all relevant information about a registered patient
     * @param walletAddress The blockchain wallet address of the patient
     * @param patientId Unique identifier assigned to the patient
     * @param registrationDate Unix timestamp when the patient was registered
     * @param isActive Boolean flag indicating if the patient account is currently active
     * @param consents Mapping of consent IDs to their corresponding consent data
     * @param consentIds Array of consent token IDs owned by this patient
     */
    struct Patient {
        address walletAddress;
        uint256 patientId;
        uint256 registrationDate;
        bool isActive;
        mapping(uint256 => ConsentData) consents;
        uint256[] consentIds;
    }

    // ============ STATE VARIABLES ============

    /// @notice Maps patient IDs to their corresponding Patient structures
    /// @dev Primary storage for all patient data and their associated consents
    mapping(uint256 => Patient) public patients;
    
    /// @notice Quick access mapping from wallet address to patient ID
    /// @dev Enables efficient lookup of patient ID from wallet address
    mapping(address => uint256) public addressToPatientId;
    
    /// @notice Maps study IDs to their authorization status
    /// @dev Controls which studies are authorized to collect patient consents
    mapping(uint256 => bool) private _authorizedStudies;
    
    /// @notice Maps study IDs to their corresponding StudyConsents structure
    /// @dev Optimized storage for efficient study-specific consent operations
    mapping(uint256 => StudyConsents) private _studyConsents;
    
    /// @notice Total number of consent tokens ever created (active and inactive)
    /// @dev Includes both active and revoked consents for historical tracking
    uint256 private _totalConsents;
    
    /// @notice Total number of currently active consent tokens
    /// @dev Only counts consents that are active and not expired
    uint256 private _totalActiveConsents;
    
    /// @notice Next consent token ID to be assigned
    /// @dev Incremented for each new consent to ensure unique token IDs
    uint256 private _nextConsentId;
    
    /// @notice Next patient ID to be assigned
    /// @dev Incremented for each new patient registration
    uint256 private _nextPatientId;
    
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error thrown when attempting to interact with an unauthorized study
    /// @dev Prevents operations on studies that haven't been approved by administrators
    error StudyNotAuthorized();
    
    /// @notice Error thrown when a wallet address is not registered as a patient
    /// @dev Ensures only registered patients can perform patient-specific actions
    error PatientNotRegistered();
    
    /// @notice Error thrown when attempting to register an already registered address
    /// @dev Prevents duplicate patient registrations for the same wallet address
    error AddressAlreadyRegistered();
    
    /// @notice Error thrown when referencing a non-existent patient ID
    /// @dev Prevents operations on invalid or non-existent patient records
    error PatientIdDoesNotExist();
    
    /// @notice Error thrown when an invalid patient address is provided
    /// @dev Prevents operations with zero address or other invalid addresses
    error InvalidPatientAddress();
    
    /// @notice Error thrown when a dataset hash is required but not provided
    /// @dev Ensures all consents have associated dataset identifiers
    error DatasetHashRequired();
    
    /// @notice Error thrown when validity duration is required but not provided
    /// @dev Ensures all consents have defined expiration periods
    error ValidityDurationRequired();
    
    /// @notice Error thrown when someone other than the consent owner tries to revoke
    /// @dev Ensures only the consent holder can revoke their own consent
    error OnlyOwnerCanRevoke();
    
    /// @notice Error thrown when attempting to revoke an already revoked consent
    /// @dev Prevents double revocation of the same consent
    error ConsentAlreadyRevoked();
    
    /// @notice Error thrown when referencing a non-existent token
    /// @dev Prevents operations on invalid or burned token IDs
    error TokenDoesNotExist();
    
    /// @notice Error thrown when a study ID is required but not provided
    /// @dev Ensures study operations have valid study identifiers
    error StudyIdRequired();
    
    /// @notice Error thrown when attempting to revoke authorization for a non-authorized study
    /// @dev Prevents revocation of studies that aren't currently authorized
    error StudyNotAuthorizedForRevocation();
    
    /// @notice Error thrown when approval operations are attempted (Soul Bound Token)
    /// @dev Prevents token approvals as consents are non-transferable
    error ApprovalsDisabled();
    
    /// @notice Error thrown when transfer operations are attempted (Soul Bound Token)
    /// @dev Prevents token transfers as consents are bound to their original holders
    error TransfersDisabled();
    
    // ============ EVENTS ============
    
    /**
     * @notice Emitted when a new patient is successfully registered
     * @param walletAddress The blockchain wallet address of the newly registered patient
     * @param patientId The unique ID assigned to the patient
     */
    event PatientRegistered(address indexed walletAddress, uint256 indexed patientId);
    
    /**
     * @notice Emitted when a patient grants consent for a medical study
     * @param tokenId The unique ID of the consent token (NFT)
     * @param patientId The ID of the patient granting consent
     * @param studyId The ID of the study for which consent is granted
     * @param datasetHash The cryptographic hash of the dataset covered by the consent
     * @param validUntil The Unix timestamp until which the consent remains valid
     */
    event ConsentGranted(uint256 indexed tokenId, uint256 indexed patientId, uint256 indexed studyId, bytes32 datasetHash, uint256 validUntil);
    
    /**
     * @notice Emitted when a patient revokes their previously granted consent
     * @param tokenId The ID of the revoked consent token
     * @param patientId The ID of the patient revoking consent
     * @param studyId The ID of the study for which consent is revoked
     * @param revokedAt The Unix timestamp when the consent was revoked
     */
    event ConsentRevoked(uint256 indexed tokenId, uint256 indexed patientId, uint256 indexed studyId, uint256 revokedAt);
    
    /**
     * @notice Emitted when a medical study is authorized to collect consents
     * @param studyId The unique ID of the authorized study
     * @param studyName The human-readable name of the study
     */
    event StudyAuthorized(uint256 indexed studyId, string studyName);
    
    /**
     * @notice Emitted when a study's authorization is revoked
     * @param studyId The ID of the study whose authorization is revoked
     * @param studyName The human-readable name of the study
     */
    event StudyRevoked(uint256 indexed studyId, string studyName);

    // ============ MODIFIERS ============

    /**
     * @notice Ensures that the specified study is authorized to collect consents
     * @dev Validates study authorization before allowing consent-related operations
     * @param studyId The ID of the study to validate
     * @custom:throws StudyNotAuthorized if the study is not authorized
     */
    modifier onlyValidStudy(uint256 studyId) {
        if (!_authorizedStudies[studyId]) revert StudyNotAuthorized();
        _;
    }
    
    /**
     * @notice Ensures that the specified wallet address belongs to a registered patient
     * @dev Validates patient registration before allowing patient-specific operations
     * @param walletAddress The wallet address to validate
     * @custom:throws PatientNotRegistered if the address is not registered
     */
    modifier onlyRegisteredPatient(address walletAddress) {
        if (!isPatientRegistered(walletAddress)) revert PatientNotRegistered();
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Constructor for the CercleConsent contract
     * @dev Initializes the ERC721 token with name "CercleConsent" and symbol "CERCONSENT"
     *      Sets up the soul-bound NFT infrastructure for medical consent management
     */
    constructor() ERC721("CercleConsent", "CERCONSENT") {}
    
    // ============ PATIENT MANAGEMENT FUNCTIONS ============
    
    /**
     * @notice Registers a new patient with a unique patient ID
     * @dev Creates a bidirectional mapping between the patient's wallet address and ID.
     *      Initializes patient data structure and emits registration event.
     * @custom:throws AddressAlreadyRegistered if the caller is already registered
     */
    function registerPatient() external {
        uint256 patientId = ++_nextPatientId;
        if (isPatientRegistered(msg.sender)) revert AddressAlreadyRegistered();

        Patient storage newPatient = patients[patientId];
        newPatient.walletAddress = msg.sender;
        newPatient.patientId = patientId;
        newPatient.registrationDate = block.timestamp;
        newPatient.isActive = true;
        newPatient.consentIds = new uint256[](0);
        
        addressToPatientId[msg.sender] = patientId;
        emit PatientRegistered(msg.sender, patientId);
    }
    
    /**
     * @notice Checks if a wallet address is registered as an active patient
     * @dev Verifies both registration and active status of a patient
     * @param walletAddress The wallet address to check
     * @return bool True if the address is registered and active, false otherwise
     */
    function isPatientRegistered(address walletAddress) public view returns (bool) {
        uint256 patientId = addressToPatientId[walletAddress];
        return patientId != uint256(0) && patients[patientId].isActive;
    }
    
    /**
     * @notice Gets the patient ID associated with a wallet address
     * @dev Retrieves the unique patient identifier for a given wallet address
     * @param walletAddress The wallet address to query
     * @return uint256 The patient ID associated with the wallet address
     * @custom:throws PatientNotRegistered if the address is not registered
     */
    function getPatientId(address walletAddress) external view returns (uint256) {
        if (!isPatientRegistered(walletAddress)) revert PatientNotRegistered();
        return addressToPatientId[walletAddress];
    }

    /**
     * @notice Gets comprehensive information about a patient
     * @dev Retrieves all basic patient data including their consent token IDs
     * @param patientId The ID of the patient to query
     * @return walletAddress The blockchain wallet address of the patient
     * @return registrationDate The Unix timestamp when the patient was registered
     * @return isActive Whether the patient account is currently active
     * @return consentTokenIds Array of consent token IDs owned by the patient
     * @custom:throws PatientIdDoesNotExist if the patient ID is invalid
     */
    function getPatientInfo(uint256 patientId) external view returns (
        address walletAddress,
        uint256 registrationDate,
        bool isActive,
        uint256[] memory consentTokenIds
    ) {
        if (patientId == uint256(0)) revert PatientIdDoesNotExist();
        if (patients[patientId].walletAddress == address(0)) revert PatientIdDoesNotExist();
        return (
            patients[patientId].walletAddress,
            patients[patientId].registrationDate,
            patients[patientId].isActive,
            patients[patientId].consentIds
        );
    }
    
    // ============ CONSENT MANAGEMENT FUNCTIONS ============
    
    /**
     * @notice Allows a registered patient to grant consent for a medical study
     * @dev Creates a new soul-bound NFT representing the consent. Updates all relevant
     *      data structures and counters for efficient querying.
     * @param datasetHash The cryptographic hash of the dataset the consent applies to
     * @param studyId The ID of the authorized study for which consent is granted
     * @param validityDuration The duration in seconds for which the consent remains valid
     * @return uint256 The ID of the newly created consent token
     * @custom:throws InvalidPatientAddress if caller address is invalid
     * @custom:throws DatasetHashRequired if dataset hash is empty
     * @custom:throws ValidityDurationRequired if validity duration is zero
     * @custom:throws PatientNotRegistered if caller is not a registered patient
     * @custom:security Only registered patients can grant consent
     * @custom:security Only authorized studies can receive consent
     */
    function selfGrantConsent(
        bytes32 datasetHash,
        uint256 studyId,
        uint256 validityDuration
    ) external onlyValidStudy(studyId) returns (uint256) {
        if (msg.sender == address(0)) revert InvalidPatientAddress();
        if (datasetHash == bytes32(0)) revert DatasetHashRequired();
        if (validityDuration == 0) revert ValidityDurationRequired();
        
        uint256 patientId = addressToPatientId[msg.sender];
        if (patientId == 0) revert PatientNotRegistered();
        uint256 consentId = ++_nextConsentId;
        
        // Store consent data in patient's record
        patients[patientId].consents[consentId] = ConsentData({
            consentId: consentId,
            datasetHash: datasetHash,
            studyId: studyId,
            validUntil: block.timestamp + validityDuration,
            createdAt: block.timestamp,
            revokedAt: 0,
            isActive: true
        });
        patients[patientId].consentIds.push(consentId);
        
        // Update study-specific consent tracking
        StudyConsents storage studyConsents = _studyConsents[studyId];
        studyConsents.activeConsents[consentId] = true;
        studyConsents.consentIds.push(consentId);
        studyConsents.activeCount++;
        
        // Mint the soul-bound NFT and update counters
        _safeMint(msg.sender, consentId);
        ++_totalConsents;
        ++_totalActiveConsents;
        
        emit ConsentGranted(consentId, patientId, studyId, datasetHash, block.timestamp + validityDuration);
        return consentId;
    }

    /**
     * @notice Allows a patient to revoke their previously granted consent
     * @dev Marks the consent as inactive and updates all relevant counters.
     *      The NFT remains in the patient's wallet but becomes inactive.
     * @param consentId The ID of the consent token to revoke
     * @param patientId The ID of the patient revoking the consent
     * @custom:throws OnlyOwnerCanRevoke if caller is not the consent owner
     * @custom:throws ConsentAlreadyRevoked if consent is already revoked
     * @custom:security Only the consent owner can revoke their consent
     */
    function revokeConsent(uint256 consentId, uint256 patientId) external {
        if (ownerOf(consentId) != msg.sender) revert OnlyOwnerCanRevoke();
        ConsentData storage consent = patients[patientId].consents[consentId];
        if (!consent.isActive) revert ConsentAlreadyRevoked();
        
        // Mark consent as revoked
        consent.isActive = false;
        consent.revokedAt = block.timestamp;
        
        // Update study-specific tracking
        StudyConsents storage studyConsents = _studyConsents[consent.studyId];
        if (studyConsents.activeConsents[consentId]) {
            studyConsents.activeConsents[consentId] = false;
            --studyConsents.activeCount;
        }
        
        --_totalActiveConsents;
        emit ConsentRevoked(consentId, patientId, consent.studyId, block.timestamp);
    }

    // ============ QUERY FUNCTIONS ============

    /**
     * @notice Gets all active consents for a specific study (optimized version)
     * @dev Efficiently retrieves only active and non-expired consents for a study.
     *      Uses optimized data structures for better performance.
     * @param studyId The ID of the study to get consents for
     * @return consentDetails Array of active consent data for the study
     * @custom:throws StudyNotAuthorized if the study is not authorized
     */
    function getConsentsByStudy(uint256 studyId) external view onlyValidStudy(studyId) returns (
        ConsentData[] memory consentDetails
    ) {
        StudyConsents storage studyConsents = _studyConsents[studyId];
        consentDetails = new ConsentData[](studyConsents.activeCount);
        
        uint256 index = 0;
        uint256[] memory consentIds = studyConsents.consentIds;
        
        for (uint256 i = 0; i < consentIds.length && index < studyConsents.activeCount; i++) {
            uint256 consentId = consentIds[i];
            
            if (studyConsents.activeConsents[consentId]) {
                address owner = _ownerOf(consentId);
                if (owner != address(0)) {
                    uint256 patientId = addressToPatientId[owner];
                    ConsentData memory consent = patients[patientId].consents[consentId];
                    
                    if (consent.isActive && block.timestamp <= consent.validUntil) {
                        consentDetails[index] = consent;
                        index++;
                    }
                }
            }
        }
        
        // Adjust array size if needed
        if (index < studyConsents.activeCount) {
            assembly {
                mstore(consentDetails, index)
            }
        }
        
        return consentDetails;
    }

    /**
     * @notice Gets the number of active consents for a study (O(1) operation)
     * @dev Provides constant-time lookup of active consent count for a study
     * @param studyId The ID of the study
     * @return uint256 The number of currently active consents for the study
     */
    function getStudyActiveConsentCount(uint256 studyId) external view returns (uint256) {
        return _studyConsents[studyId].activeCount;
    }

    /**
     * @notice Gets all consent token IDs owned by a specific patient
     * @dev Returns both active and revoked consent tokens for comprehensive tracking
     * @param patientId The ID of the patient
     * @return uint256[] Array of consent token IDs owned by the patient
     */
    function getPatientConsents(uint256 patientId) external view returns (uint256[] memory) {
        return patients[patientId].consentIds;
    }
    
    /**
     * @notice Gets the total number of consent tokens owned by a patient
     * @dev Counts both active and revoked consents for the specified patient
     * @param patientId The ID of the patient
     * @return uint256 The total number of consent tokens owned by the patient
     */
    function getPatientConsentCount(uint256 patientId) external view returns (uint256) {
        return patients[patientId].consentIds.length;
    }
    
    /**
     * @notice Gets the total number of consent tokens ever created
     * @dev Includes both active and revoked consents for historical tracking
     * @return uint256 The total number of consent tokens (active and inactive)
     */
    function getTotalConsents() external view returns (uint256) {
        return _totalConsents;
    }
    
    /**
     * @notice Gets the total number of currently active consent tokens
     * @dev Only counts consents that are active and not expired
     * @return uint256 The total number of active consent tokens
     */
    function getTotalActiveConsents() external view returns (uint256) {
        return _totalActiveConsents;
    }
    
    /**
     * @notice Checks if a specific consent token is currently valid
     * @dev Validates both active status and expiration time of a consent
     * @param consentId The ID of the consent token to check
     * @param patientId The ID of the patient who owns the consent
     * @return bool True if the consent is valid and not expired, false otherwise
     */
    function isConsentValid(uint256 consentId, uint256 patientId) public view returns (bool) {
        if (!_exists(consentId)) return false;
        ConsentData memory consent = patients[patientId].consents[consentId];
        return consent.isActive && block.timestamp <= consent.validUntil;
    }
    
    /**
     * @notice Gets comprehensive details of a specific consent token
     * @dev Retrieves all stored information about a consent including timestamps
     * @param consentId The ID of the consent token to query
     * @param patientId The ID of the patient who owns the consent
     * @return ConsentData Complete consent data structure
     * @custom:throws TokenDoesNotExist if the consent token doesn't exist
     */
    function getConsentDetails(uint256 consentId, uint256 patientId) external view returns (ConsentData memory) {
        if (!_exists(consentId)) revert TokenDoesNotExist();
        return patients[patientId].consents[consentId];
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Authorizes a medical study to collect patient consents
     * @dev Enables a study to receive consent grants from patients
     * @param studyId The unique ID of the study to authorize
     * @param studyName The human-readable name of the study for tracking
     * @custom:throws StudyIdRequired if study ID is zero
     * @custom:security Should be restricted to contract administrators in production
     */
    function authorizeStudy(uint256 studyId, string memory studyName) external {
        if (studyId == uint256(0)) revert StudyIdRequired();
        _authorizedStudies[studyId] = true;
        emit StudyAuthorized(studyId, studyName);
    }

    /**
     * @notice Revokes the authorization of a medical study
     * @dev Prevents a study from receiving new consent grants
     * @param studyId The ID of the study whose authorization to revoke
     * @param studyName The human-readable name of the study for tracking
     * @custom:throws StudyNotAuthorizedForRevocation if study is not currently authorized
     * @custom:security Should be restricted to contract administrators in production
     */
    function revokeStudyAuthorization(uint256 studyId, string memory studyName) external {
        if (!_authorizedStudies[studyId]) revert StudyNotAuthorizedForRevocation();
        _authorizedStudies[studyId] = false;
        emit StudyRevoked(studyId, studyName);
    }
    
    /**
     * @notice Checks if a study is currently authorized to collect consents
     * @dev Public function to verify study authorization status
     * @param studyId The ID of the study to check
     * @return bool True if the study is authorized, false otherwise
     */
    function isStudyAuthorized(uint256 studyId) external view returns (bool) {
        return _authorizedStudies[studyId];
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Checks if a token exists by verifying it has an owner
     * @param tokenId The ID of the token to check
     * @return bool True if the token exists, false otherwise
     */
    function _exists(uint256 tokenId) private view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev Internal helper function to populate active consents array
     * @param studyConsentIds Array of consent IDs for a study
     * @param consentDetails Array to populate with active consent details
     */
    function _populateActiveConsents(
        uint256[] memory studyConsentIds,
        ConsentData[] memory consentDetails
    ) internal view {
        uint256 index = 0;
        for (uint256 i = 0; i < studyConsentIds.length; i++) {
            uint256 consentId = studyConsentIds[i];
            address owner = _ownerOf(consentId);
            if (owner != address(0)) {
                uint256 patientId = addressToPatientId[owner];
                ConsentData memory consent = patients[patientId].consents[consentId];
                if (isConsentValid(consentId, patientId)) {
                    consentDetails[index] = consent;
                    index++;
                }
            }
        }
    }
    
    // ============ SOUL BOUND TOKEN IMPLEMENTATION ============
    
    /**
     * @notice Soul Bound Token - Approval function disabled
     * @dev Always reverts as approvals are not allowed for soul-bound tokens
     * @param to Address that would be approved (unused)
     * @param tokenId Token ID that would be approved (unused)
     * @custom:throws ApprovalsDisabled Always reverts to prevent approvals
     */
    function approve(address to, uint256 tokenId) public pure override {
        // Silence unused parameter warnings
        to;
        tokenId;
        revert ApprovalsDisabled();
    }
    
    /**
     * @notice Soul Bound Token - Approval for all function disabled
     * @dev Always reverts as approvals are not allowed for soul-bound tokens
     * @param operator Address that would be approved (unused)
     * @param approved Approval status (unused)
     * @custom:throws ApprovalsDisabled Always reverts to prevent approvals
     */
    function setApprovalForAll(address operator, bool approved) public pure override {
        // Silence unused parameter warnings
        operator;
        approved;
        revert ApprovalsDisabled();
    }
    
    /**
     * @notice Soul Bound Token - No approvals are possible
     * @dev Always returns zero address as no approvals are allowed
     * @param tokenId Token ID to check approval for (unused)
     * @return address Always returns address(0) as no approvals exist
     */
    function getApproved(uint256 tokenId) public pure override returns (address) {
        // Silence unused parameter warning
        tokenId;
        return address(0);
    }
    
    /**
     * @notice Soul Bound Token - No approval for all is possible
     * @dev Always returns false as no approvals are allowed
     * @param owner Owner address (unused)
     * @param operator Operator address (unused)
     * @return bool Always returns false as no approvals exist
     */
    function isApprovedForAll(address owner, address operator) public pure override returns (bool) {
        // Silence unused parameter warnings
        owner;
        operator;
        return false;
    }

    /**
     * @notice Override _update to block all transfers (Soul Bound Token)
     * @dev This function is called by all transfer operations. Only allows minting
     *      (from == address(0)) and blocks all other transfers to maintain soul-bound nature.
     * @param to The address to transfer to
     * @param tokenId The ID of the token to transfer
     * @param auth The address authorized to perform the transfer
     * @return address The previous owner of the token
     * @custom:throws TransfersDisabled if attempting to transfer between non-zero addresses
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Block all other transfers (Soul Bound Token)
        revert TransfersDisabled();
    }
}