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

  async function deployConsentFixture() {
    // Contract deployment
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const patient1 = signers[1];
    const patient2 = signers[2];

    const ConsentFactory = await ethers.getContractFactory("MedicalConsentNFT");
    const consentContract = await ConsentFactory.deploy(owner.address) as MedicalConsentNFT;

    // Test data preparation
    const studyId = ethers.keccak256(ethers.toUtf8Bytes("Study1"));
    const studyName = "Clinical study on diabetes";
    const datasetHash = ethers.keccak256(ethers.toUtf8Bytes("PatientData1"));

    // Authorize the study
    await consentContract.authorizeStudy(studyId, studyName);

    return { consentContract, owner, patient1, patient2, studyId, studyName, datasetHash };
  }

  describe("Patient management", function () {
    it("Should allow a user to register as a patient", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await consentContract.connect(patient1).registerPatient();
      const isRegistered = await consentContract.isPatientRegistered(patient1.address);
      expect(isRegistered).to.be.true;
    });

    it("Should not allow a patient to register twice", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await consentContract.connect(patient1).registerPatient();
      await expect(consentContract.connect(patient1).registerPatient())
        .to.be.revertedWith("Adresse deja enregistree");
    });

    it("Should retrieve the patient ID from their address", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await consentContract.connect(patient1).registerPatient();
      const patientId = await consentContract.getPatientId(patient1.address);
      expect(patientId).to.be.gt(0);
    });

    it("Should retrieve the patient address from their ID", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await consentContract.connect(patient1).registerPatient();
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientAddress = await consentContract.getPatientAddress(patientId);
      expect(patientAddress).to.equal(patient1.address);
    });

    it("Should retrieve patient information", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await consentContract.connect(patient1).registerPatient();
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientInfo = await consentContract.getPatientInfo(patientId);
      
      expect(patientInfo[0]).to.equal(patient1.address); // walletAddress
      expect(patientInfo[1]).to.be.gt(0); // registrationDate
      expect(patientInfo[2]).to.be.true; // active
    });
  });

  describe("Study management", function () {
    it("Should authorize a study by the owner", async function () {
      const { consentContract, owner } = await deployConsentFixture();
      const newStudyId = ethers.keccak256(ethers.toUtf8Bytes("Study2"));
      const newStudyName = "Study on hypertension";
      
      await consentContract.connect(owner).authorizeStudy(newStudyId, newStudyName);
      const isAuthorized = await consentContract.isStudyAuthorized(newStudyId);
      expect(isAuthorized).to.be.true;
    });

    it("Should not authorize a study by a non-owner", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      const newStudyId = ethers.keccak256(ethers.toUtf8Bytes("Study3"));
      const newStudyName = "Unauthorized study";
      
      await expect(consentContract.connect(patient1).authorizeStudy(newStudyId, newStudyName))
        .to.be.revertedWithCustomError(consentContract, "OwnableUnauthorizedAccount");
    });

    it("Should revoke a study authorization", async function () {
      const { consentContract, owner, studyId, studyName } = await deployConsentFixture();
      await consentContract.connect(owner).revokeStudyAuthorization(studyId, studyName);
      const isAuthorized = await consentContract.isStudyAuthorized(studyId);
      expect(isAuthorized).to.be.false;
    });
  });

  describe("Consent management", function () {
     async function deployConsentWithRegisteredPatientFixture() {
      const baseFixture = await deployConsentFixture();
      await baseFixture.consentContract.connect(baseFixture.patient1).registerPatient();
      return baseFixture;
    }

    it("Should allow a patient to grant consent", async function () {
      const { consentContract, patient1, datasetHash, studyId } = await deployConsentWithRegisteredPatientFixture();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      
      const tx = await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );

      // Verify that the consent was created
      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      expect(patientConsents.length).to.equal(1);

      // Verify that the consent is valid
      const tokenId = patientConsents[0];
      const isValid = await consentContract.isConsentValid(tokenId);
      expect(isValid).to.be.true;
    });

    it("Should not allow granting consent for an unauthorized study", async function () {
      const { consentContract, patient1, datasetHash } = await deployConsentWithRegisteredPatientFixture();
      const invalidStudyId = ethers.keccak256(ethers.toUtf8Bytes("InvalidStudy"));
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      
      await expect(consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        invalidStudyId,
        validityDuration
      )).to.be.revertedWith("Etude non autorisee");
    });

    it("Should allow a patient to revoke their consent", async function () {
      const { consentContract, patient1, datasetHash, studyId } = await deployConsentWithRegisteredPatientFixture();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );

      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      const tokenId = patientConsents[0];
      
      await consentContract.connect(patient1).revokeConsent(tokenId);
      
      // Verify that the consent is no longer valid
      const isValid = await consentContract.isConsentValid(tokenId);
      expect(isValid).to.be.false;
      
      // Verify that the consent has been removed from the patient's list
      const updatedConsents = await consentContract.getPatientConsents(patient1.address);
      expect(updatedConsents.length).to.equal(0);
    });

    it("Should not allow a non-owner to revoke a consent", async function () {
      const { consentContract, patient1, patient2, datasetHash, studyId } = await deployConsentWithRegisteredPatientFixture();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );

      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      const tokenId = patientConsents[0];
      
      // Patient2 tries to revoke patient1's consent
      await expect(consentContract.connect(patient2).revokeConsent(tokenId))
        .to.be.revertedWith("Seul le proprietaire peut revoquer");
    });

    it("Should retrieve consent details", async function () {
      const { consentContract, patient1, datasetHash, studyId } = await deployConsentWithRegisteredPatientFixture();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      
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

  describe("Administrative features", function () {
    it("Should allow the owner to pause the contract", async function () {     
      const { consentContract, owner, patient1, datasetHash, studyId } = await deployConsentFixture();
      // Register a patient
      await consentContract.connect(patient1).registerPatient();
      // Try to grant consent while the contract is paused
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      await consentContract.connect(owner).pause();
      await expect(consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      )).to.be.revertedWithCustomError(consentContract, "EnforcedPause");
    });

    it("Should allow the owner to unpause the contract after a pause", async function () {
      const { consentContract, owner, patient1, datasetHash, studyId } = await deployConsentFixture();
      await consentContract.connect(owner).pause();
      await consentContract.connect(owner).unpause();
      // Register a patient
      await consentContract.connect(patient1).registerPatient();
      
      // Grant consent after reactivation
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );
      
      // Verify that the consent was created
      const patientConsents = await consentContract.getPatientConsents(patient1.address);
      expect(patientConsents.length).to.equal(1);
    });

    it("Should not allow a non-owner to pause the contract", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await expect(consentContract.connect(patient1).pause())
        .to.be.revertedWithCustomError(consentContract, "OwnableUnauthorizedAccount");
    });
  });
});