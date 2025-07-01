// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MedicalConsentNFT is ERC721, ERC721Burnable, Ownable, Pausable, ReentrancyGuard {
    
    struct ConsentData {
        bytes32 datasetHash;
        bytes32 studyId;          
        uint256 validUntil;       
        uint256 createdAt;        
        bool isActive;                    
    }
    
    mapping(address => uint256) public addressToPatientId;    // Adresse MetaMask → PatientId
    mapping(uint256 => address) public patientIdToAddress;    // PatientId → Adresse MetaMask
    mapping(uint256 => uint256) public patientRegistrationDate; 
    mapping(uint256 => bool) public isPatientActive;         
    mapping(uint256 => ConsentData) private _consents;
    mapping(bytes32 => bool) private _authorizedStudies;
    mapping(address => uint256[]) private _patientTokens;
    mapping(uint256 => uint256) private _tokenIndexInPatientArray;
    uint256 private _totalTokens;
    uint256 private _nextTokenId;
    uint256 private _nextPatientId = 1;
    
    event PatientRegistered(address indexed walletAddress, uint256 indexed patientId);
    event ConsentGranted(uint256 indexed tokenId, uint256 indexed patientId, bytes32 indexed studyId, bytes32 datasetHash, uint256 validUntil);
    event ConsentRevoked(uint256 indexed tokenId, uint256 indexed patientId, bytes32 indexed studyId, uint256 revokedAt);
    event StudyAuthorized(bytes32 indexed studyId, string studyName);
    event StudyRevoked (bytes32 indexed studyId, string studyName);

    modifier onlyValidStudy(bytes32 studyId) {
        require(_authorizedStudies[studyId], "Etude non autorisee");
        _;
    }
    
    modifier onlyRegisteredPatient(address walletAddress) {
        require(isPatientRegistered(walletAddress), "Patient non enregistre");
        _;
    }
    
    constructor(address initialOwner) ERC721("Medical Consent NFT", "MCNFT") Ownable(initialOwner) {}
    
    /**
     * @dev Enregistrer un nouveau patient avec un patientId unique
     */
    function registerPatient() external {
        uint256 patientId = ++ _nextPatientId;
        require(!isPatientRegistered(msg.sender), "Adresse deja enregistree");
        // Création du lien bidirectionnel
        addressToPatientId[msg.sender] = patientId;
        patientIdToAddress[patientId] = msg.sender;
        patientRegistrationDate[patientId] = block.timestamp;
        isPatientActive[patientId] = true;      
        emit PatientRegistered(msg.sender, patientId);
    }
    
    /**
     * @dev Vérifier si une adresse wallet est enregistrée
     */
    function isPatientRegistered(address walletAddress) public view returns (bool) {
        uint256 patientId = addressToPatientId[walletAddress];
        return patientId != uint256(0) && isPatientActive[patientId];
    }
    
    /**
     * @dev Obtenir le patientId d'une adresse wallet
     */
    function getPatientId(address walletAddress) external view returns (uint256) {
        require(isPatientRegistered(walletAddress), "Patient non enregistre");
        return addressToPatientId[walletAddress];
    }
    
    /**
     * @dev Obtenir l'adresse wallet d'un patientId
     */
    function getPatientAddress(uint256 patientId) external view returns (address) {
        address patientAddress = patientIdToAddress[patientId];
        require(patientAddress != address(0), "PatientId inexistant");
        return patientAddress;
    }
    
    /**
     * @dev Obtenir les informations de base d'un patient (données on-chain uniquement)
     */
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
    
    /**
     * @dev Accorder un consentement par le patient lui-même
     */
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
    
    /**
     * @dev Révoquer un consentement
     */
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
    
    function getPatientConsents(address patient) external view returns (uint256[] memory) {
        return _patientTokens[patient];
    }
    
    function getPatientConsentCount(address patient) external view returns (uint256) {
        return _patientTokens[patient].length;
    }
    
    function totalSupply() external view returns (uint256) {
        return _totalTokens;
    }
    
    function _addTokenToPatient(address patient, uint256 tokenId) private {
        _tokenIndexInPatientArray[tokenId] = _patientTokens[patient].length;
        _patientTokens[patient].push(tokenId);
    }
    
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
    
    function isConsentValid(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        ConsentData memory consent = _consents[tokenId];
        return consent.isActive && block.timestamp <= consent.validUntil;
    }
    
    function getConsentDetails(uint256 tokenId) external view returns (ConsentData memory) {
        require(_exists(tokenId), "Token inexistant");
        return _consents[tokenId];
    }
    
    function authorizeStudy(bytes32 studyId, string memory studyName) external onlyOwner {
        require(studyId != bytes32(0), "ID etude requis");
        _authorizedStudies[studyId] = true;
        emit StudyAuthorized(studyId, studyName);
    }

    function revokeStudyAuthorization(bytes32 studyId, string memory studyName) external onlyOwner {
        require(_authorizedStudies[studyId], "Etude non autorisee");
        _authorizedStudies[studyId] = false;
        emit StudyRevoked(studyId, studyName);
    }
    
    function isStudyAuthorized(bytes32 studyId) external view returns (bool) {
        return _authorizedStudies[studyId];
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function _exists(uint256 tokenId) private view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}