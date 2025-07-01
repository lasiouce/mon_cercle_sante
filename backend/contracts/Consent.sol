// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Medical Consent NFT Contract
/// @author lasiouce (https://github.com/lasiouce)  
/// @notice This contract manages medical consent as NFTs for patients participating in medical studies
/// @dev Implements ERC721 standard with additional functionality for consent management
contract MedicalConsentNFT is ERC721, ERC721Burnable, Ownable, Pausable, ReentrancyGuard {
    
    /// @notice Structure to store consent data
    /// @dev Contains all relevant information about a specific consent
    struct ConsentData {
        bytes32 datasetHash;      /// @notice Hash of the dataset the consent applies to
        bytes32 studyId;          /// @notice Identifier of the study
        uint256 validUntil;       /// @notice Timestamp until which the consent is valid
        uint256 createdAt;        /// @notice Timestamp when the consent was created
        bool isActive;            /// @notice Flag indicating if the consent is currently active
    }
    
    /// @notice Maps wallet addresses to patient IDs
    mapping(address => uint256) public addressToPatientId;
    /// @notice Maps patient IDs to wallet addresses
    mapping(uint256 => address) public patientIdToAddress;
    /// @notice Maps patient IDs to registration timestamps
    mapping(uint256 => uint256) public patientRegistrationDate;
    /// @notice Maps patient IDs to active status
    mapping(uint256 => bool) public isPatientActive;
    /// @notice Maps token IDs to consent data
    mapping(uint256 => ConsentData) private _consents;
    /// @notice Maps study IDs to authorization status
    mapping(bytes32 => bool) private _authorizedStudies;
    /// @notice Maps patient addresses to their token IDs
    mapping(address => uint256[]) private _patientTokens;
    /// @notice Maps token IDs to their index in the patient's token array
    mapping(uint256 => uint256) private _tokenIndexInPatientArray;
    /// @notice Total number of active consent tokens
    uint256 private _totalTokens;
    /// @notice Next token ID to be assigned
    uint256 private _nextTokenId;
    /// @notice Next patient ID to be assigned
    uint256 private _nextPatientId = 1;
    
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
    constructor(address initialOwner) ERC721("Medical Consent NFT", "MCNFT") Ownable(initialOwner) {}
    
    /// @notice Registers a new patient with a unique patient ID
    /// @dev Creates a bidirectional mapping between the patient's address and ID
    function registerPatient() external {
        uint256 patientId = ++ _nextPatientId;
        require(!isPatientRegistered(msg.sender), "Adresse deja enregistree");
        addressToPatientId[msg.sender] = patientId;
        patientIdToAddress[patientId] = msg.sender;
        patientRegistrationDate[patientId] = block.timestamp;
        isPatientActive[patientId] = true;      
        emit PatientRegistered(msg.sender, patientId);
    }
    
    /// @notice Checks if a wallet address is registered as a patient
    /// @param walletAddress The wallet address to check
    /// @return True if the address is registered and active, false otherwise
    function isPatientRegistered(address walletAddress) public view returns (bool) {
        uint256 patientId = addressToPatientId[walletAddress];
        return patientId != uint256(0) && isPatientActive[patientId];
    }
    
    /// @notice Gets the patient ID associated with a wallet address
    /// @param walletAddress The wallet address to query
    /// @return The patient ID associated with the wallet address
    function getPatientId(address walletAddress) external view returns (uint256) {
        require(isPatientRegistered(walletAddress), "Patient non enregistre");
        return addressToPatientId[walletAddress];
    }
    
    /// @notice Gets the wallet address associated with a patient ID
    /// @param patientId The patient ID to query
    /// @return The wallet address associated with the patient ID
    function getPatientAddress(uint256 patientId) external view returns (address) {
        address patientAddress = patientIdToAddress[patientId];
        require(patientAddress != address(0), "PatientId inexistant");
        return patientAddress;
    }
    
    /// @notice Gets the basic information of a patient
    /// @param patientId The ID of the patient to query
    /// @return walletAddress The wallet address of the patient
    /// @return registrationDate The timestamp when the patient was registered
    /// @return active Whether the patient is active
    function getPatientInfo(uint256 patientId) external view returns (
        address walletAddress,
        uint256 registrationDate,
        bool active
    ) {
        require(patientIdToAddress[patientId] != address(0), "PatientId inexistant");
        return (
            patientIdToAddress[patientId],
            patientRegistrationDate[patientId],
            isPatientActive[patientId]
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
    ) external whenNotPaused onlyValidStudy(studyId) nonReentrant returns (uint256) {
        require(msg.sender != address(0), "Invalid patient address");
        require(datasetHash != bytes32(0), "Dataset hash required");
        require(validityDuration > 0, "Validity duration required");
        
        uint256 patientId = addressToPatientId[msg.sender];
        
        uint256 tokenId = _nextTokenId++;
        uint256 validUntil = block.timestamp + validityDuration;
        require(!_exists(tokenId), "Token already exists");
        
        _consents[tokenId] = ConsentData({
            datasetHash: datasetHash,
            studyId: studyId,
            validUntil: validUntil,
            createdAt: block.timestamp,
            isActive: true
        });
        _safeMint(msg.sender, tokenId);
        _addTokenToPatient(msg.sender, tokenId);
        _totalTokens++;
        emit ConsentGranted(tokenId, patientId, studyId, datasetHash, validUntil);
        return tokenId;
    }
    
    /// @notice Allows a patient to revoke a previously granted consent
    /// @param tokenId The ID of the consent token to revoke
    function revokeConsent(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Seul le proprietaire peut revoquer");
        
        ConsentData storage consent = _consents[tokenId];
        require(consent.isActive, "Consentement deja revoque");
        
        consent.isActive = false;
        address patientAddress = ownerOf(tokenId);
        uint256 patientId = addressToPatientId[patientAddress];
        bytes32 studyId = consent.studyId;
        _removeTokenFromPatient(patientAddress, tokenId);
        _burn(tokenId);
        _totalTokens--;
        emit ConsentRevoked(tokenId, patientId, studyId, block.timestamp);
    }
    
    /// @notice Gets all consent tokens owned by a patient
    /// @param patient The address of the patient
    /// @return An array of token IDs owned by the patient
    function getPatientConsents(address patient) external view returns (uint256[] memory) {
        return _patientTokens[patient];
    }
    
    /// @notice Gets the number of consent tokens owned by a patient
    /// @param patient The address of the patient
    /// @return The number of consent tokens owned by the patient
    function getPatientConsentCount(address patient) external view returns (uint256) {
        return _patientTokens[patient].length;
    }
    
    /// @notice Gets the total number of active consent tokens
    /// @return The total number of active consent tokens
    function totalSupply() external view returns (uint256) {
        return _totalTokens;
    }
    
    /// @dev Adds a token to a patient's token array
    /// @param patient The address of the patient
    /// @param tokenId The ID of the token to add
    function _addTokenToPatient(address patient, uint256 tokenId) private {
        _tokenIndexInPatientArray[tokenId] = _patientTokens[patient].length;
        _patientTokens[patient].push(tokenId);
    }
    
    /// @dev Removes a token from a patient's token array
    /// @param patient The address of the patient
    /// @param tokenId The ID of the token to remove
    function _removeTokenFromPatient(address patient, uint256 tokenId) private {
        uint256[] storage tokens = _patientTokens[patient];
        uint256 tokenIndex = _tokenIndexInPatientArray[tokenId];
        uint256 lastTokenIndex = tokens.length - 1;
        
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = tokens[lastTokenIndex];
            tokens[tokenIndex] = lastTokenId;
            _tokenIndexInPatientArray[lastTokenId] = tokenIndex;
        }
        tokens.pop();
        delete _tokenIndexInPatientArray[tokenId];
    }
    
    /// @notice Checks if a consent token is valid
    /// @param tokenId The ID of the consent token to check
    /// @return True if the consent is valid, false otherwise
    function isConsentValid(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        ConsentData memory consent = _consents[tokenId];
        return consent.isActive && block.timestamp <= consent.validUntil;
    }
    
    /// @notice Gets the details of a consent token
    /// @param tokenId The ID of the consent token to query
    /// @return The consent data associated with the token
    function getConsentDetails(uint256 tokenId) external view returns (ConsentData memory) {
        require(_exists(tokenId), "Token inexistant");
        return _consents[tokenId];
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
}