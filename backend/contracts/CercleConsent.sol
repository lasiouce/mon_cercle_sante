// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title CercleConsent NFT Contract
/// @author lasiouce (https://github.com/lasiouce)  
/// @notice This contract manages medical consent as NFTs for patients participating in medical studies
/// @dev Implements ERC721 standard with additional functionality for consent management
contract CercleConsent is ERC721 {
    
    /// @notice Structure to store consent data
    /// @dev Contains all relevant information about a specific consent
    struct ConsentData {
        uint256 consentId;        /// @notice Unique identifier for the consent
        bytes32 datasetHash;      /// @notice Hash of the dataset the consent applies to
        uint256 studyId;          /// @notice Identifier of the study
        uint256 validUntil;       /// @notice Timestamp until which the consent is valid
        uint256 createdAt;        /// @notice Timestamp when the consent was created
        uint256 revokedAt;        /// @notice Timestamp when the consent was revoked
        bool isActive;            /// @notice Flag indicating if the consent is currently active
    }

    /// @notice Structure pour gérer efficacement les consentements par étude
    struct StudyConsents {
        mapping(uint256 => bool) activeConsents;  // consentId => isActive
        uint256[] consentIds;                     // Liste des IDs pour l'itération
        uint256 activeCount;                      // Compteur des consentements actifs
    }

    /// @notice Structure to store patient information
    /// @dev Contains all relevant information about a specific patient
    struct Patient {
        address walletAddress;        /// @notice The wallet address of the patient
        uint256 patientId;            /// @notice Unique identifier for the patient
        uint256 registrationDate;     /// @notice Timestamp when the patient was registered
        bool isActive;                /// @notice Flag indicating if the patient is currently active
        mapping(uint256 => ConsentData) consents;    /// @notice Mapping of consent IDs to consent data for this patient
        uint256[] consentIds;   /// @notice Array of consent token IDs owned by this patient
    }

    /// @notice Maps patient IDs to Patient structures
    mapping(uint256 => Patient) public patients;
    /// @notice Quick access mapping from wallet address to patient ID
    mapping(address => uint256) public addressToPatientId;
    /// @notice Maps study IDs to authorization status
    mapping(uint256 => bool) private _authorizedStudies;
    /// @notice Maps study IDs to arrays of consent IDs
    mapping(uint256 => StudyConsents) private _studyConsents;
    /// @notice Total number of consent tokens
    uint256 private _totalConsents;
    /// @notice Total number of active consent tokens
    uint256 private _totalActiveConsents;
    /// @notice Next token ID to be assigned
    uint256 private _nextConsentId;       
    /// @notice Next patient ID to be assigned
    uint256 private _nextPatientId;
    
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error thrown when a study is not authorized
    error StudyNotAuthorized();
    
    /// @notice Error thrown when a patient is not registered
    error PatientNotRegistered();
    
    /// @notice Error thrown when an address is already registered
    error AddressAlreadyRegistered();
    
    /// @notice Error thrown when a patient ID does not exist
    error PatientIdDoesNotExist();
    
    /// @notice Error thrown when a patient address is invalid
    error InvalidPatientAddress();
    
    /// @notice Error thrown when dataset hash is required
    error DatasetHashRequired();
    
    /// @notice Error thrown when validity duration is required
    error ValidityDurationRequired();
    
    /// @notice Error thrown when only the owner can revoke
    error OnlyOwnerCanRevoke();
    
    /// @notice Error thrown when consent is already revoked
    error ConsentAlreadyRevoked();
    
    /// @notice Error thrown when a token does not exist
    error TokenDoesNotExist();
    
    /// @notice Error thrown when study ID is required
    error StudyIdRequired();
    
    /// @notice Error thrown when a study is not authorized for revocation
    error StudyNotAuthorizedForRevocation();
    
    /// @notice Error thrown when approvals are disabled (Soul Bound Token)
    error ApprovalsDisabled();
    
    /// @notice Error thrown when transfers are disabled (Soul Bound Token)
    error TransfersDisabled();
    
    /// @notice Emitted when a patient is registered
    /// @param walletAddress The address of the patient's wallet
    /// @param patientId The unique ID assigned to the patient
    event PatientRegistered(address indexed walletAddress, uint256 indexed patientId);
    
    /// @notice Emitted when a consent is granted
    /// @param tokenId The ID of the consent token
    /// @param patientId The ID of the patient granting consent
    /// @param studyId The ID of the study for which consent is granted
    /// @param datasetHash The hash of the dataset covered by the consent
    /// @param validUntil The timestamp until which the consent is valid
    event ConsentGranted(uint256 indexed tokenId, uint256 indexed patientId, uint256 indexed studyId, bytes32 datasetHash, uint256 validUntil);
    
    /// @notice Emitted when a consent is revoked
    /// @param tokenId The ID of the revoked consent token
    /// @param patientId The ID of the patient revoking consent
    /// @param studyId The ID of the study for which consent is revoked
    /// @param revokedAt The timestamp when the consent was revoked
    event ConsentRevoked(uint256 indexed tokenId, uint256 indexed patientId, uint256 indexed studyId, uint256 revokedAt);
    
    /// @notice Emitted when a study is authorized
    /// @param studyId The ID of the authorized study
    /// @param studyName The name of the study
    event StudyAuthorized(uint256 indexed studyId, string studyName);
    
    /// @notice Emitted when a study authorization is revoked
    /// @param studyId The ID of the study whose authorization is revoked
    /// @param studyName The name of the study
    event StudyRevoked(uint256 indexed studyId, string studyName);

    /// @notice Ensures that the study is authorized
    /// @param studyId The ID of the study to check
    modifier onlyValidStudy(uint256 studyId) {
        if (!_authorizedStudies[studyId]) revert StudyNotAuthorized();
        _;
    }
    
    /// @notice Ensures that the patient is registered
    /// @param walletAddress The wallet address of the patient to check
    modifier onlyRegisteredPatient(address walletAddress) {
        if (!isPatientRegistered(walletAddress)) revert PatientNotRegistered();
        _;
    }
    
    /// @notice Constructor for the CercleConsent contract
    constructor() ERC721("CercleConsent", "CERCONSENT") {}
    
    /// @notice Registers a new patient with a unique patient ID
    /// @dev Creates a bidirectional mapping between the patient's address and ID
    function registerPatient() external {
        uint256 patientId = ++ _nextPatientId;
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
    
    /// @notice Checks if a wallet address is registered as a patient
    /// @param walletAddress The wallet address to check
    /// @return True if the address is registered and active, false otherwise
    function isPatientRegistered(address walletAddress) public view returns (bool) {
        uint256 patientId = addressToPatientId[walletAddress];
        return patientId != uint256(0) && patients[patientId].isActive;
    }
    
    /// @notice Gets the patient ID associated with a wallet address
    /// @param walletAddress The wallet address to query
    /// @return The patient ID associated with the wallet address
    function getPatientId(address walletAddress) external view returns (uint256) {
        if (!isPatientRegistered(walletAddress)) revert PatientNotRegistered();
        return addressToPatientId[walletAddress];
    }

    /// @notice Gets the basic information of a patient
    /// @param patientId The ID of the patient to query
    /// @return walletAddress The wallet address of the patient
    /// @return registrationDate The timestamp when the patient was registered
    /// @return isActive Whether the patient is active
    /// @return consentTokenIds The IDs of the patient's consent tokens
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
    
    /// @notice Allows a patient to grant consent for a study
    /// @dev Creates a new NFT representing the consent
    /// @param datasetHash The hash of the dataset the consent applies to
    /// @param studyId The ID of the study for which consent is granted
    /// @param validityDuration The duration in seconds for which the consent is valid
    /// @return The ID of the newly created consent token
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
        
        StudyConsents storage studyConsents = _studyConsents[studyId];
        studyConsents.activeConsents[consentId] = true;
        studyConsents.consentIds.push(consentId);
        studyConsents.activeCount++;
        
        _safeMint(msg.sender, consentId);
        ++ _totalConsents;
        ++ _totalActiveConsents;
        emit ConsentGranted(consentId, patientId, studyId, datasetHash, block.timestamp + validityDuration);
        return consentId;
    }

    function revokeConsent(uint256 consentId, uint256 patientId) external {
        if (ownerOf(consentId) != msg.sender) revert OnlyOwnerCanRevoke();
        ConsentData storage consent = patients[patientId].consents[consentId];
        if (!consent.isActive) revert ConsentAlreadyRevoked();
        
        consent.isActive = false;
        consent.revokedAt = block.timestamp;
        
        StudyConsents storage studyConsents = _studyConsents[consent.studyId];
        if (studyConsents.activeConsents[consentId]) {
            studyConsents.activeConsents[consentId] = false;
            -- studyConsents.activeCount;
        }
        
        -- _totalActiveConsents;
        emit ConsentRevoked(consentId, patientId, consent.studyId, block.timestamp);
    }

    /// @notice Gets all active consents for a specific study (optimized version)
    /// @param studyId The ID of the study to get consents for
    /// @return consentDetails An array of active consent data for the study
    function getConsentsByStudy(uint256 studyId) onlyValidStudy(studyId) external view returns (
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
        
        if (index < studyConsents.activeCount) {
            assembly {
                mstore(consentDetails, index)
            }
        }
        
        return consentDetails;
    }

    /// @notice Gets the number of active consents for a study (O(1) operation)
    /// @param studyId The ID of the study
    /// @return The number of active consents for the study
    function getStudyActiveConsentCount(uint256 studyId) external view returns (uint256) {
        return _studyConsents[studyId].activeCount;
    }

    // Supprimer la fonction _removeConsentFromStudy car elle n'est plus nécessaire
    // Supprimer les fonctions _countActiveConsents et _populateActiveConsents

    /// @notice Gets all consent tokens owned by a patientId
    /// @param patientId The ID of the patient
    /// @return An array of token IDs owned by the patient
    function getPatientConsents(uint256 patientId) external view returns (uint256[] memory) {
        return patients[patientId].consentIds;
    }
    
    /// @notice Gets the number of consent tokens owned by a patient
    /// @param patientId The ID of the patient
    /// @return The number of consent tokens owned by the patient
    function getPatientConsentCount(uint256 patientId) external view returns (uint256) {
        return patients[patientId].consentIds.length;
    }
    
    /// @notice Gets the total number of consent tokens (active and inactive)
    /// @return The total number of consent tokens
    function getTotalConsents() external view returns (uint256) {
        return _totalConsents;
    }
    
    /// @notice Gets the total number of active consent tokens
    /// @return The total number of active consent tokens  
    function getTotalActiveConsents() external view returns (uint256) {
        return _totalActiveConsents;
    }
    
    /// @notice Checks if a consent token is valid
    /// @param consentId The ID of the consent token to check
    /// @param patientId The ID of the patient
    /// @return True if the consent is valid, false otherwise
    function isConsentValid(uint256 consentId, uint256 patientId) public view returns (bool) {
        if (!_exists(consentId)) return false;
        ConsentData memory consent = patients[patientId].consents[consentId];
        return consent.isActive && block.timestamp <= consent.validUntil;
    }
    
    /// @notice Gets the details of a consent token
    /// @param consentId The ID of the consent token to query
    /// @return The consent data associated with the token
    function getConsentDetails(uint256 consentId, uint256 patientId) external view returns (ConsentData memory) {
        if (!_exists(consentId)) revert TokenDoesNotExist();
        return patients[patientId].consents[consentId];
    }
    
    /// @notice Authorizes a study to collect consents
    /// @param studyId The ID of the study to authorize
    /// @param studyName The name of the study
    function authorizeStudy(uint studyId, string memory studyName) external {
        if (studyId == uint(0)) revert StudyIdRequired();
        _authorizedStudies[studyId] = true;
        emit StudyAuthorized(studyId, studyName);
    }

    /// @notice Revokes the authorization of a study
    /// @param studyId The ID of the study whose authorization to revoke
    /// @param studyName The name of the study
    function revokeStudyAuthorization(uint256 studyId, string memory studyName) external {
        if (!_authorizedStudies[studyId]) revert StudyNotAuthorizedForRevocation();
        _authorizedStudies[studyId] = false;
        emit StudyRevoked(studyId, studyName);
    }
    
    /// @notice Checks if a study is authorized
    /// @param studyId The ID of the study to check
    /// @return True if the study is authorized, false otherwise
    function isStudyAuthorized(uint256 studyId) external view returns (bool) {
        return _authorizedStudies[studyId];
    }
    
    /// @dev Checks if a token exists
    /// @param tokenId The ID of the token to check
    /// @return True if the token exists, false otherwise
    function _exists(uint256 tokenId) private view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /// @notice Soul Bound Token - Approvals are disabled
    function approve(address, uint256) public pure override {
        revert ApprovalsDisabled();
    }
    
    /// @notice Soul Bound Token - Approval for all is disabled
    function setApprovalForAll(address, bool) public pure override {
        revert ApprovalsDisabled();
    }
    
    /// @notice Soul Bound Token - No approvals are possible
    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }
    
    /// @notice Soul Bound Token - No approval for all is possible
    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }

    /// @notice Override _update to block all transfers (Soul Bound Token)
    /// @dev This function is called by all transfer operations
    /// @param to The address to transfer to
    /// @param tokenId The ID of the token to transfer
    /// @param auth The address authorized to perform the transfer
    /// @return The previous owner of the token
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Block all other transfers
        revert TransfersDisabled();
    }

    function _countActiveConsents(uint256[] memory studyConsentIds) internal view returns (uint256 count) {
        for (uint256 i = 0; i < studyConsentIds.length; i++) {
            uint256 consentId = studyConsentIds[i];
            address owner = _ownerOf(consentId);
            if (owner != address(0)) {
                uint256 patientId = addressToPatientId[owner];
                if (isConsentValid(consentId, patientId)) {
                    count++;
                }
            }
        }
    }
    
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
}