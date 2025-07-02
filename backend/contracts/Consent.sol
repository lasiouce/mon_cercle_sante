// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CercleConsent NFT Contract
/// @author lasiouce (https://github.com/lasiouce)  
/// @notice This contract manages medical consent as NFTs for patients participating in medical studies
/// @dev Implements ERC721 standard with additional functionality for consent management
contract CercleConsent is ERC721, Ownable, Pausable {
    
    /// @notice Structure to store consent data
    /// @dev Contains all relevant information about a specific consent
    struct ConsentData {
        uint256 consentId;        /// @notice Unique identifier for the consent
        bytes32 datasetHash;      /// @notice Hash of the dataset the consent applies to
        bytes32 studyId;          /// @notice Identifier of the study
        uint256 validUntil;       /// @notice Timestamp until which the consent is valid
        uint256 createdAt;        /// @notice Timestamp when the consent was created
        uint256 revokedAt;        /// @notice Timestamp when the consent was revoked
        bool isActive;            /// @notice Flag indicating if the consent is currently active
    }

    struct Patient {
        address walletAddress;        // Adresse du portefeuille du patient
        uint256 patientId;            // ID unique du patient
        uint256 registrationDate;     // Date d'enregistrement
        bool isActive;                // Statut actif/inactif
        mapping(uint256 => ConsentData) consents;    // Consentements du patient
        uint256[] consentIds;   // Identifiants des tokens de consentement du patient
    }

    /// @notice Maps patient IDs to Patient structures
    mapping(uint256 => Patient) public patients;
    /// @notice Mapping d'accès rapide par adresse
    mapping(address => uint256) public addressToPatientId;
    /// @notice Maps study IDs to authorization status
    mapping(bytes32 => bool) private _authorizedStudies;
    /// @notice Total number of active consent tokens
    uint256 private _totalConsents;
    /// @notice Next token ID to be assigned
    uint256 private _nextConsentId;       
    /// @notice Next patient ID to be assigned
    uint256 private _nextPatientId;
    
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
    event ConsentGranted(uint256 indexed tokenId, uint256 indexed patientId, bytes32 indexed studyId, bytes32 datasetHash, uint256 validUntil);
    
    /// @notice Emitted when a consent is revoked
    /// @param tokenId The ID of the revoked consent token
    /// @param patientId The ID of the patient revoking consent
    /// @param studyId The ID of the study for which consent is revoked
    /// @param revokedAt The timestamp when the consent was revoked
    event ConsentRevoked(uint256 indexed tokenId, uint256 indexed patientId, bytes32 indexed studyId, uint256 revokedAt);
    
    /// @notice Emitted when a study is authorized
    /// @param studyId The ID of the authorized study
    /// @param studyName The name of the study
    event StudyAuthorized(bytes32 indexed studyId, string studyName);
    
    /// @notice Emitted when a study authorization is revoked
    /// @param studyId The ID of the study whose authorization is revoked
    /// @param studyName The name of the study
    event StudyRevoked(bytes32 indexed studyId, string studyName);

    /// @notice Ensures that the study is authorized
    /// @param studyId The ID of the study to check
    modifier onlyValidStudy(bytes32 studyId) {
        require(_authorizedStudies[studyId], "Etude non autorisee");
        _;
    }
    
    /// @notice Ensures that the patient is registered
    /// @param walletAddress The wallet address of the patient to check
    modifier onlyRegisteredPatient(address walletAddress) {
        require(isPatientRegistered(walletAddress), "Patient non enregistre");
        _;
    }
    
    /// @notice Initializes the contract with the specified owner
    /// @param initialOwner The address of the initial owner of the contract
    constructor(address initialOwner) ERC721("CercleConsent", "CERCONSENT") Ownable(initialOwner) {}
    
    /// @notice Registers a new patient with a unique patient ID
    /// @dev Creates a bidirectional mapping between the patient's address and ID
    function registerPatient() external {
        uint256 patientId = ++ _nextPatientId;
        require(!isPatientRegistered(msg.sender), "Adresse deja enregistree");

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
        require(isPatientRegistered(walletAddress), "Patient non enregistre");
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
    require(patientId!= uint256(0), "PatientId inexistant");
    require(patients[patientId].walletAddress != address(0), "PatientId inexistant");
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
        bytes32 studyId,
        uint256 validityDuration
    ) external whenNotPaused onlyValidStudy(studyId) returns (uint256) {
        require(msg.sender != address(0), "Invalid patient address");
        require(datasetHash != bytes32(0), "Dataset hash required");
        require(validityDuration > 0, "Validity duration required");
        
        uint256 patientId = addressToPatientId[msg.sender];
        require(patientId != 0, "Patient non enregistre");
        uint256 consentId = _nextConsentId++;
        
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
        _safeMint(msg.sender, consentId);
        ++ _totalConsents;
        emit ConsentGranted(_nextConsentId++, patientId, studyId, datasetHash, block.timestamp + validityDuration);
        return consentId;
    }
    
    /// @notice Allows a patient to revoke a previously granted consent
    /// @param consentId The ID of the consent token to revoke
    function revokeConsent(uint256 consentId, uint256 patientId) external {
        require(ownerOf(consentId) == msg.sender, "Seul le proprietaire peut revoquer");
        ConsentData storage consent = patients[patientId].consents[consentId];
        require(consent.isActive, "Consentement deja revoque");

        consent.isActive = false;
        consent.revokedAt = block.timestamp;

        // Supprimer de la liste des IDs 
        uint256[] storage consentIds = patients[patientId].consentIds;
        for (uint256 i = 0; i < consentIds.length; i++) {
            if (consentIds[i] == consentId) {
            // Swap and pop pour économiser du gaz
            consentIds[i] = consentIds[consentIds.length - 1];
            consentIds.pop();
            break;
            }
        }
        -- _totalConsents;
        emit ConsentRevoked(consentId, patientId, consent.studyId, block.timestamp);
    }
    
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
    
    /// @notice Gets the total number of active consent tokens
    /// @return The total number of active consent tokens
    function totalSupply() external view returns (uint256) {
        return _totalConsents;
    }
    
    /// @notice Checks if a consent token is valid
    /// @param tokenId The ID of the consent token to check
    /// @param patientId The ID of the patient
    /// @return True if the consent is valid, false otherwise
    function isConsentValid(uint256 tokenId, uint256 patientId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        ConsentData memory consent = patients[patientId].consents[tokenId];
        return consent.isActive && block.timestamp <= consent.validUntil;
    }
    
    /// @notice Gets the details of a consent token
    /// @param tokenId The ID of the consent token to query
    /// @return The consent data associated with the token
    function getConsentDetails(uint256 tokenId, uint256 patientId) external view returns (ConsentData memory) {
        require(_exists(tokenId), "Token inexistant");
        return patients[patientId].consents[tokenId];
    }
    
    /// @notice Authorizes a study to collect consents
    /// @param studyId The ID of the study to authorize
    /// @param studyName The name of the study
    function authorizeStudy(bytes32 studyId, string memory studyName) external onlyOwner {
        require(studyId != bytes32(0), "ID etude requis");
        _authorizedStudies[studyId] = true;
        emit StudyAuthorized(studyId, studyName);
    }

    /// @notice Revokes the authorization of a study
    /// @param studyId The ID of the study whose authorization to revoke
    /// @param studyName The name of the study
    function revokeStudyAuthorization(bytes32 studyId, string memory studyName) external onlyOwner {
        require(_authorizedStudies[studyId], "Etude non autorisee");
        _authorizedStudies[studyId] = false;
        emit StudyRevoked(studyId, studyName);
    }
    
    /// @notice Checks if a study is authorized
    /// @param studyId The ID of the study to check
    /// @return True if the study is authorized, false otherwise
    function isStudyAuthorized(bytes32 studyId) external view returns (bool) {
        return _authorizedStudies[studyId];
    }
    
    /// @notice Pauses the contract
    /// @dev Can only be called by the contract owner
    function pause() external onlyOwner { _pause(); }
    
    /// @notice Unpauses the contract
    /// @dev Can only be called by the contract owner
    function unpause() external onlyOwner { _unpause(); }
    
    /// @dev Checks if a token exists
    /// @param tokenId The ID of the token to check
    /// @return True if the token exists, false otherwise
    function _exists(uint256 tokenId) private view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /// @notice Soul Bound Token - Les approbations sont interdites
    function approve(address, uint256) public pure override {
        revert("CERCONSENT: Les approbations sont interdites");
    }
    
    /// @notice Soul Bound Token - Les approbations pour tous sont interdites
    function setApprovalForAll(address, bool) public pure override {
        revert("CERCONSENT: Les approbations sont interdites");
    }
    
    /// @notice Soul Bound Token - Aucune approbation n'est possible
    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }
    
    /// @notice Soul Bound Token - Aucune approbation pour tous n'est possible
    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }

    /// @notice Override _update pour bloquer tous les transferts (Soul Bound Token)
    /// @dev Cette fonction est appelée par toutes les opérations de transfert
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Permettre le minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Bloquer tous les autres transferts
        revert("CERCONSENT: Les transferts sont interdits");
    }
}