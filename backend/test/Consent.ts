import { expect } from "chai";
import { ethers } from "hardhat";
import { MedicalConsentNFT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MedicalConsentNFT", function () {
  let consentContract: MedicalConsentNFT;
  let owner: HardhatEthersSigner;
  let patient1: HardhatEthersSigner;
  let patient2: HardhatEthersSigner;
  let studyId: string;
  let studyName: string;
  let datasetHash: string;

  beforeEach(async function () {
    // Déploiement du contrat
    const signers = await ethers.getSigners();
    owner = signers[0];
    patient1 = signers[1];
    patient2 = signers[2];

    const ConsentFactory = await ethers.getContractFactory("MedicalConsentNFT");
    consentContract = await ConsentFactory.deploy(owner.address) as MedicalConsentNFT;

    // Préparation des données de test
    studyId = ethers.keccak256(ethers.toUtf8Bytes("Study1"));
    studyName = "Étude clinique sur le diabète";
    datasetHash = ethers.keccak256(ethers.toUtf8Bytes("PatientData1"));

    // Autoriser l'étude
    await consentContract.authorizeStudy(studyId, studyName);
  });

  describe("Gestion des patients", function () {
    it("Devrait permettre à un utilisateur de s'enregistrer comme patient", async function () {
      await consentContract.connect(patient1).registerPatient();
      const isRegistered = await consentContract.isPatientRegistered(patient1.address);
      expect(isRegistered).to.be.true;
    });

    it("Ne devrait pas permettre à un patient de s'enregistrer deux fois", async function () {
      await consentContract.connect(patient1).registerPatient();
      await expect(consentContract.connect(patient1).registerPatient())
        .to.be.revertedWith("Adresse deja enregistree");
    });

    it("Devrait récupérer l'ID du patient à partir de son adresse", async function () {
      await consentContract.connect(patient1).registerPatient();
      const patientId = await consentContract.getPatientId(patient1.address);
      expect(patientId).to.be.gt(0);
    });

    it("Devrait récupérer l'adresse du patient à partir de son ID", async function () {
      await consentContract.connect(patient1).registerPatient();
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientAddress = await consentContract.getPatientAddress(patientId);
      expect(patientAddress).to.equal(patient1.address);
    });

    it("Devrait récupérer les informations du patient", async function () {
      await consentContract.connect(patient1).registerPatient();
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientInfo = await consentContract.getPatientInfo(patientId);
      
      expect(patientInfo[0]).to.equal(patient1.address); // walletAddress
      expect(patientInfo[1]).to.be.gt(0); // registrationDate
      expect(patientInfo[2]).to.be.true; // active
    });
  });

  describe("Gestion des études", function () {
    it("Devrait autoriser une étude par le propriétaire", async function () {
      const newStudyId = ethers.keccak256(ethers.toUtf8Bytes("Study2"));
      const newStudyName = "Étude sur l'hypertension";
      
      await consentContract.connect(owner).authorizeStudy(newStudyId, newStudyName);
      const isAuthorized = await consentContract.isStudyAuthorized(newStudyId);
      expect(isAuthorized).to.be.true;
    });

    it("Ne devrait pas autoriser une étude par un non-propriétaire", async function () {
      const newStudyId = ethers.keccak256(ethers.toUtf8Bytes("Study3"));
      const newStudyName = "Étude non autorisée";
      
      await expect(consentContract.connect(patient1).authorizeStudy(newStudyId, newStudyName))
        .to.be.revertedWithCustomError(consentContract, "OwnableUnauthorizedAccount");
    });

    it("Devrait révoquer l'autorisation d'une étude", async function () {
      await consentContract.connect(owner).revokeStudyAuthorization(studyId, studyName);
      const isAuthorized = await consentContract.isStudyAuthorized(studyId);
      expect(isAuthorized).to.be.false;
    });
  });

  describe("Gestion des consentements", function () {
    beforeEach(async function () {
      // Enregistrer le patient
      await consentContract.connect(patient1).registerPatient();
    });

    it("Devrait permettre à un patient d'accorder son consentement", async function () {
      const validityDuration = 60 * 60 * 24 * 30; // 30 jours en secondes
      
      const tx = await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );

      // Vérifier que le consentement a été créé
      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      expect(patientConsents.length).to.equal(1);

      // Vérifier que le consentement est valide
      const tokenId = patientConsents[0];
      const isValid = await consentContract.isConsentValid(tokenId);
      expect(isValid).to.be.true;
    });

    it("Ne devrait pas permettre d'accorder un consentement pour une étude non autorisée", async function () {
      const invalidStudyId = ethers.keccak256(ethers.toUtf8Bytes("InvalidStudy"));
      const validityDuration = 60 * 60 * 24 * 30; // 30 jours en secondes
      
      await expect(consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        invalidStudyId,
        validityDuration
      )).to.be.revertedWith("Etude non autorisee");
    });

    it("Devrait permettre à un patient de révoquer son consentement", async function () {
      const validityDuration = 60 * 60 * 24 * 30; // 30 jours en secondes
      
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );

      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      const tokenId = patientConsents[0];
      
      await consentContract.connect(patient1).revokeConsent(tokenId);
      
      // Vérifier que le consentement n'est plus valide
      const isValid = await consentContract.isConsentValid(tokenId);
      expect(isValid).to.be.false;
      
      // Vérifier que le consentement a été supprimé de la liste du patient
      const updatedConsents = await consentContract.getPatientConsents(patient1.address);
      expect(updatedConsents.length).to.equal(0);
    });

    it("Ne devrait pas permettre à un non-propriétaire de révoquer un consentement", async function () {
      const validityDuration = 60 * 60 * 24 * 30; // 30 jours en secondes
      
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );

      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      const tokenId = patientConsents[0];
      
      // Patient2 essaie de révoquer le consentement de patient1
      await expect(consentContract.connect(patient2).revokeConsent(tokenId))
        .to.be.revertedWith("Seul le proprietaire peut revoquer");
    });

    it("Devrait récupérer les détails d'un consentement", async function () {
      const validityDuration = 60 * 60 * 24 * 30; // 30 jours en secondes
      
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );

      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      const tokenId = patientConsents[0];
      const consentDetails = await consentContract.getConsentDetails(tokenId);
      expect(consentDetails.datasetHash).to.equal(datasetHash);
      expect(consentDetails.studyId).to.equal(studyId);
      expect(consentDetails.isActive).to.be.true;
    });
  });

  describe("Fonctionnalités administratives", function () {
    it("Devrait permettre au propriétaire de mettre en pause le contrat", async function () {     
      // Enregistrer un patient
      await consentContract.connect(patient1).registerPatient();
      
      // Essayer d'accorder un consentement pendant que le contrat est en pause
      const validityDuration = 60 * 60 * 24 * 30; // 30 jours en secondes
      await consentContract.connect(owner).pause();
      await expect(consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      )).to.be.revertedWithCustomError(consentContract, "EnforcedPause");
    });

    it("Devrait permettre au propriétaire de réactiver le contrat après une pause", async function () {
      // Mettre en pause
      await consentContract.connect(owner).pause();
      
      // Réactiver
      await consentContract.connect(owner).unpause();
      
      // Enregistrer un patient
      await consentContract.connect(patient1).registerPatient();
      
      // Accorder un consentement après la réactivation
      const validityDuration = 60 * 60 * 24 * 30; // 30 jours en secondes
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );
      
      // Vérifier que le consentement a été créé
      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      expect(patientConsents.length).to.equal(1);
    });

    it("Ne devrait pas permettre à un non-propriétaire de mettre en pause le contrat", async function () {
      await expect(consentContract.connect(patient1).pause())
        .to.be.revertedWithCustomError(consentContract, "OwnableUnauthorizedAccount");
    });
  });
});