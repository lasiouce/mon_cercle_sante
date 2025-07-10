import { expect } from "chai";
import { ethers } from "hardhat";
import { CercleConsent } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MedicalConsentNFT", function () {
  let consentContract: CercleConsent;
  let owner: HardhatEthersSigner;
  let patient1: HardhatEthersSigner;
  let patient2: HardhatEthersSigner;
  let studyId: string;
  let studyName: string;
  let datasetHash: string;

  async function deployConsentFixture() {
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const patient1 = signers[1];
    const patient2 = signers[2];

    const ConsentFactory = await ethers.getContractFactory("CercleConsent");
    const consentContract = await ConsentFactory.deploy() as CercleConsent;

    const studyId = ethers.keccak256(ethers.toUtf8Bytes("Study1"));
    const studyName = "Clinical study on diabetes";
    const datasetHash = ethers.keccak256(ethers.toUtf8Bytes("PatientData1"));

    await consentContract.authorizeStudy(studyId, studyName);

    return { consentContract, owner, patient1, patient2, studyId, studyName, datasetHash };
  }

  async function deployWithRegisteredPatient() {
    const baseFixture = await deployConsentFixture();
    await baseFixture.consentContract.connect(baseFixture.patient1).registerPatient();
    return baseFixture;
  }

  async function deployWithOneConsent() {
    const baseFixture = await deployWithRegisteredPatient();
    const validityDuration = 60 * 60 * 24 * 30; // 30 days
    
    await baseFixture.consentContract.connect(baseFixture.patient1).selfGrantConsent(
      baseFixture.datasetHash,
      baseFixture.studyId,
      validityDuration
    );
    
    const patientId = await baseFixture.consentContract.getPatientId(baseFixture.patient1.address);
    const patientConsents = await baseFixture.consentContract.getPatientConsents(patientId);
    const tokenId = patientConsents[0];
    
    return { ...baseFixture, tokenId, patientId, validityDuration };
  }

  describe("Patient management", function () {
    it("Should handle patient registration and validation correctly", async function () {
      const { consentContract, patient1, patient2 } = await deployConsentFixture();
      
      // Test successful registration
      await consentContract.connect(patient1).registerPatient();
      const isRegistered = await consentContract.isPatientRegistered(patient1.address);
      expect(isRegistered).to.be.true;
      
      // Test duplicate registration prevention
      await expect(consentContract.connect(patient1).registerPatient())
        .to.be.revertedWithCustomError(consentContract, "AddressAlreadyRegistered");
      
      // Test patient ID retrieval
      const patientId = await consentContract.getPatientId(patient1.address);
      expect(patientId).to.be.gt(0);
      
      // Test unregistered patient
      expect(await consentContract.isPatientRegistered(patient2.address)).to.be.false;
    });

    it("Should retrieve patient information and handle edge cases", async function () {
      const { consentContract, patient1, patient2 } = await deployWithRegisteredPatient();
      
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientInfo = await consentContract.getPatientInfo(patientId);
      
      expect(patientInfo[0]).to.equal(patient1.address); // walletAddress
      expect(patientInfo[1]).to.be.gt(0); // registrationDate
      expect(patientInfo[2]).to.be.true; // isActive
      expect(patientInfo[3]).to.be.an('array'); // consentIds
      
      // Test invalid patient IDs
      await expect(consentContract.getPatientInfo(0))
        .to.be.revertedWithCustomError(consentContract, "PatientIdDoesNotExist");
      await expect(consentContract.getPatientInfo(999))
        .to.be.revertedWithCustomError(consentContract, "PatientIdDoesNotExist");
      
      // Test onlyRegisteredPatient modifier logic (lines 89-90)
      // This covers the modifier's require statement and error message
      await expect(consentContract.getPatientId(patient2.address))
        .to.be.revertedWithCustomError(consentContract, "PatientNotRegistered");
      
      // Verify the modifier's positive case
      const isRegistered = await consentContract.isPatientRegistered(patient1.address);
      expect(isRegistered).to.be.true;
      
      const isNotRegistered = await consentContract.isPatientRegistered(patient2.address);
      expect(isNotRegistered).to.be.false;
    });
  });

  describe("Study management", function () {
    it("Should handle study authorization and validation", async function () {
      const { consentContract, owner, patient1 } = await deployConsentFixture();
      const newStudyId = ethers.keccak256(ethers.toUtf8Bytes("Study2"));
      const newStudyName = "Study on hypertension";
      
      // Test successful authorization
      await consentContract.connect(owner).authorizeStudy(newStudyId, newStudyName);
      const isAuthorized = await consentContract.isStudyAuthorized(newStudyId);
      expect(isAuthorized).to.be.true;
      
      // Test empty study ID validation
      await expect(consentContract.connect(owner).authorizeStudy(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "Test Study"
      )).to.be.revertedWithCustomError(consentContract, "StudyIdRequired");
    });

    it("Should handle study authorization revocation", async function () {
      const { consentContract, owner, studyId, studyName } = await deployConsentFixture();
      
      // Test successful revocation
      await consentContract.connect(owner).revokeStudyAuthorization(studyId, studyName);
      const isAuthorized = await consentContract.isStudyAuthorized(studyId);
      expect(isAuthorized).to.be.false;
      
      // Test revoking non-authorized study
      const nonAuthorizedStudyId = ethers.keccak256(ethers.toUtf8Bytes("NonAuthorizedStudy"));
      await expect(consentContract.connect(owner).revokeStudyAuthorization(
        nonAuthorizedStudyId,
        "Non Authorized Study"
      )).to.be.revertedWithCustomError(consentContract, "StudyNotAuthorizedForRevocation");
    });
  });

  describe("Consent management", function () {
    const validityDuration = 60 * 60 * 24 * 30; // 30 days
    
    it("Should handle consent granting with comprehensive validation", async function () {
      const { consentContract, patient1, datasetHash, studyId } = await deployWithRegisteredPatient();
      
      // Test successful consent granting
      const tx = await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        validityDuration
      );
      
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      expect(patientConsents.length).to.equal(1);
      
      const tokenId = patientConsents[0];
      const isValid = await consentContract.isConsentValid(tokenId, patientId);
      expect(isValid).to.be.true;
      
      // Test utility functions
      const consentCount = await consentContract.getPatientConsentCount(patientId);
      expect(consentCount).to.equal(1);
      
      const totalActiveConsents = await consentContract.getTotalActiveConsents();
      expect(totalActiveConsents).to.equal(1);
      
      const balance = await consentContract.balanceOf(patient1.address);
      expect(balance).to.equal(1);
    });

    it("Should validate consent parameters and reject invalid inputs", async function () {
      const { consentContract, patient1, studyId, datasetHash } = await deployWithRegisteredPatient();
      
      const testCases = [
        {
          name: "empty dataset hash",
          datasetHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          studyId: studyId,
          validityDuration: validityDuration,
          expectedError: "DatasetHashRequired"
        },
        {
          name: "zero validity duration",
          datasetHash: datasetHash,
          studyId: studyId,
          validityDuration: 0,
          expectedError: "ValidityDurationRequired"
        },
        {
          name: "unauthorized study",
          datasetHash: datasetHash,
          studyId: ethers.keccak256(ethers.toUtf8Bytes("InvalidStudy")),
          validityDuration: validityDuration,
          expectedError: "StudyNotAuthorized"
        }
      ];

      for (const testCase of testCases) {
        await expect(consentContract.connect(patient1).selfGrantConsent(
          testCase.datasetHash,
          testCase.studyId,
          testCase.validityDuration
        )).to.be.revertedWithCustomError(consentContract, testCase.expectedError);
      }
    });

    it("Should handle consent revocation and validation", async function () {
      const { consentContract, patient1, patient2, tokenId, patientId } = await deployWithOneConsent();
      
      // Test unauthorized revocation
      await expect(consentContract.connect(patient2).revokeConsent(tokenId, patientId))
        .to.be.revertedWithCustomError(consentContract, "OnlyOwnerCanRevoke");
      
      // Test successful revocation
      await consentContract.connect(patient1).revokeConsent(tokenId, patientId);
      
      const isValid = await consentContract.isConsentValid(tokenId, patientId);
      expect(isValid).to.be.false;
      
      // Test double revocation
      await expect(consentContract.connect(patient1).revokeConsent(tokenId, patientId))
        .to.be.revertedWithCustomError(consentContract, "ConsentAlreadyRevoked");
    });

    it("Should retrieve consent details and handle edge cases", async function () {
      const { consentContract, datasetHash, studyId, tokenId, patientId } = await deployWithOneConsent();
      
      // Test valid consent details
      const consentDetails = await consentContract.getConsentDetails(tokenId, patientId);
      expect(consentDetails.datasetHash).to.equal(datasetHash);
      expect(consentDetails.studyId).to.equal(studyId);
      expect(consentDetails.isActive).to.be.true;
      
      // Test non-existent token
      const nonExistentTokenId = 999;
      const nonExistentPatientId = 999;
      
      await expect(consentContract.getConsentDetails(nonExistentTokenId, nonExistentPatientId))
        .to.be.revertedWithCustomError(consentContract, "TokenDoesNotExist");
      
      const isValidNonExistent = await consentContract.isConsentValid(nonExistentTokenId, nonExistentPatientId);
      expect(isValidNonExistent).to.be.false;
    });

    it("Should handle expired consents correctly", async function () {
      const { consentContract, patient1, datasetHash, studyId } = await deployWithRegisteredPatient();
      
      const shortValidityDuration = 1; // 1 second
      await consentContract.connect(patient1).selfGrantConsent(
        datasetHash,
        studyId,
        shortValidityDuration
      );

      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      const tokenId = patientConsents[0];
      
      // Advance blockchain time by 2 seconds to ensure expiration
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      const isValid = await consentContract.isConsentValid(tokenId, patientId);
      expect(isValid).to.be.false;
    });
  });

  describe("Soul Bound Token (SBT) Features", function () {
    it("Should prevent all transfer operations", async function () {
      const { consentContract, patient1, patient2, tokenId } = await deployWithOneConsent();
      
      const transferTests = [
        {
          name: "transferFrom",
          operation: () => consentContract.connect(patient1).transferFrom(patient1.address, patient2.address, tokenId)
        },
        {
          name: "safeTransferFrom (without data)",
          operation: () => consentContract.connect(patient1)["safeTransferFrom(address,address,uint256)"](
            patient1.address, patient2.address, tokenId
          )
        },
        {
          name: "safeTransferFrom (with data)",
          operation: () => consentContract.connect(patient1)["safeTransferFrom(address,address,uint256,bytes)"](
            patient1.address, patient2.address, tokenId, "0x"
          )
        },
        {
          name: "transfer from non-owner",
          operation: () => consentContract.connect(patient2).transferFrom(patient1.address, patient2.address, tokenId)
        },
        {
          name: "self-transfer",
          operation: () => consentContract.connect(patient1).transferFrom(patient1.address, patient1.address, tokenId)
        }
      ];

      for (const test of transferTests) {
        await expect(test.operation())
          .to.be.revertedWithCustomError(consentContract, "TransfersDisabled");
      }
    });

    it("Should prevent all approval operations and return correct values", async function () {
      const { consentContract, patient1, patient2, tokenId } = await deployWithOneConsent();
      
      // Test approval restrictions
      await expect(consentContract.connect(patient1).approve(patient2.address, tokenId))
        .to.be.revertedWithCustomError(consentContract, "ApprovalsDisabled");
      
      await expect(consentContract.connect(patient1).setApprovalForAll(patient2.address, true))
        .to.be.revertedWithCustomError(consentContract, "ApprovalsDisabled");
      
      // Test approval getters
      const approved = await consentContract.getApproved(tokenId);
      expect(approved).to.equal(ethers.ZeroAddress);
      
      const isApproved = await consentContract.isApprovedForAll(patient1.address, patient2.address);
      expect(isApproved).to.be.false;
    });

    it("Should maintain correct ownership and support ERC721 interface", async function () {
      const { consentContract, patient1, patient2, tokenId } = await deployWithOneConsent();
      
      // Test ownership
      const owner = await consentContract.ownerOf(tokenId);
      expect(owner).to.equal(patient1.address);
      
      const balance1 = await consentContract.balanceOf(patient1.address);
      const balance2 = await consentContract.balanceOf(patient2.address);
      expect(balance1).to.equal(1);
      expect(balance2).to.equal(0);
      
      // Test ERC721 interface support
      const supportsERC721 = await consentContract.supportsInterface("0x80ac58cd");
      expect(supportsERC721).to.be.true;
      
      // Test ownership persistence after failed transfer
      await expect(
        consentContract.connect(patient1).transferFrom(patient1.address, patient2.address, tokenId)
      ).to.be.revertedWithCustomError(consentContract, "TransfersDisabled");
      
      const ownerAfterFailedTransfer = await consentContract.ownerOf(tokenId);
      expect(ownerAfterFailedTransfer).to.equal(patient1.address);
    });

    it("Should handle multiple tokens and revocation correctly", async function () {
      const { consentContract, patient1, datasetHash, studyId } = await deployWithRegisteredPatient();
      
      const validityDuration = 60 * 60 * 24 * 30;
      
      // Grant multiple consents
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
      
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      expect(patientConsents.length).to.equal(2);
      
      // Test that all tokens are non-transferable
      for (const tokenId of patientConsents) {
        await expect(
          consentContract.connect(patient1).transferFrom(patient1.address, patient1.address, tokenId)
        ).to.be.revertedWithCustomError(consentContract, "TransfersDisabled");
      }
      
      // Test revocation maintains token existence
      const firstTokenId = patientConsents[0];
      await consentContract.connect(patient1).revokeConsent(firstTokenId, patientId);
      
      const ownerAfterRevocation = await consentContract.ownerOf(firstTokenId);
      expect(ownerAfterRevocation).to.equal(patient1.address);
      
      const consentDetails = await consentContract.getConsentDetails(firstTokenId, patientId);
      expect(consentDetails.isActive).to.be.false;
      expect(consentDetails.revokedAt).to.be.gt(0);
    });
  });
  
  describe("Consent by study", function () {
    it("Should return empty array for study with no consents", async function () {
      const { consentContract, studyId } = await deployConsentFixture();
      
      const consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents).to.be.an('array');
      expect(consents.length).to.equal(0);
    });

    it("Should return single consent for study with one consent", async function () {
      const { consentContract, datasetHash, studyId } = await deployWithOneConsent();
      const consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(1);
      const consent = consents[0];
      console.log(consent.consentId)
      expect(consent.datasetHash).to.equal(datasetHash);
      expect(consent.studyId).to.equal(studyId);
      expect(consent.isActive).to.be.true;
      expect(consent.consentId).to.equal(1);
      expect(consent.validUntil).to.be.gt(0);
      expect(consent.createdAt).to.be.gt(0);
      expect(consent.revokedAt).to.equal(0);
    });

    it("Should return multiple consents for study with multiple patients", async function () {
      const { consentContract, patient1, patient2, datasetHash, studyId } = await deployConsentFixture();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days
      
      // Register both patients
      await consentContract.connect(patient1).registerPatient();
      await consentContract.connect(patient2).registerPatient();
      
      // Grant consents from both patients
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
      await consentContract.connect(patient2).selfGrantConsent(datasetHash, studyId, validityDuration);
      
      const consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(2);
      
      // Verify both consents are for the same study
      consents.forEach(consent => {
        expect(consent.studyId).to.equal(studyId);
        expect(consent.isActive).to.be.true;
        expect(consent.datasetHash).to.equal(datasetHash);
      });
      
      // Verify consents have different IDs
      expect(consents[0].consentId).to.not.equal(consents[1].consentId);
    });

    it("Should return multiple consents from same patient for same study", async function () {
      const { consentContract, patient1, datasetHash, studyId } = await deployWithRegisteredPatient();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days
      
      // Grant multiple consents from same patient
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
      
      const consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(3);
      
      // Verify all consents are active and for the same study
      consents.forEach(consent => {
        expect(consent.studyId).to.equal(studyId);
        expect(consent.isActive).to.be.true;
        expect(consent.datasetHash).to.equal(datasetHash);
      });
      
      // Verify all consents have unique IDs
      const consentIds = consents.map(c => c.consentId.toString());
      const uniqueIds = new Set(consentIds);
      expect(uniqueIds.size).to.equal(3);
    });

    it("Should exclude revoked consents from results", async function () {
      const { consentContract, patient1, patient2, datasetHash, studyId } = await deployConsentFixture();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days
      
      // Register both patients
      await consentContract.connect(patient1).registerPatient();
      await consentContract.connect(patient2).registerPatient();
      
      // Grant consents from both patients
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
      await consentContract.connect(patient2).selfGrantConsent(datasetHash, studyId, validityDuration);
      
      // Verify we have 2 active consents
      let consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(2);
      
      // Revoke one consent
      const patient1Id = await consentContract.getPatientId(patient1.address);
      const patient1Consents = await consentContract.getPatientConsents(patient1Id);
      const tokenToRevoke = patient1Consents[0];
      
      await consentContract.connect(patient1).revokeConsent(tokenToRevoke, patient1Id);
      
      // Verify only 1 active consent remains
      consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(1);
      expect(consents[0].isActive).to.be.true;
    });

    it("Should exclude expired consents from results", async function () {
      const { consentContract, patient1, patient2, datasetHash, studyId } = await deployConsentFixture();
      
      // Register both patients
      await consentContract.connect(patient1).registerPatient();
      await consentContract.connect(patient2).registerPatient();
      
      // Grant one short-lived consent and one long-lived consent
      const shortDuration = 1; // 1 second
      const longDuration = 60 * 60 * 24 * 30; // 30 days
      
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, shortDuration);
      await consentContract.connect(patient2).selfGrantConsent(datasetHash, studyId, longDuration);
      
      // Verify we have 2 active consents initially
      let consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(2);
      
      // Advance time to expire the short-lived consent
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      // Verify only 1 active consent remains (the non-expired one)
      consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(1);
      expect(consents[0].isActive).to.be.true;
    });

    it("Should filter consents by study ID correctly", async function () {
      const { consentContract, owner, patient1, datasetHash } = await deployWithRegisteredPatient();
      const validityDuration = 60 * 60 * 24 * 30; // 30 days
      
      // Create two different studies
      const study1Id = ethers.keccak256(ethers.toUtf8Bytes("Study1"));
      const study2Id = ethers.keccak256(ethers.toUtf8Bytes("Study2"));
      
      await consentContract.connect(owner).authorizeStudy(study1Id, "Study 1");
      await consentContract.connect(owner).authorizeStudy(study2Id, "Study 2");
      
      // Grant consents for both studies
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, study1Id, validityDuration);
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, study1Id, validityDuration);
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, study2Id, validityDuration);
      
      // Verify study1 has 2 consents
      const study1Consents = await consentContract.getConsentsByStudy(study1Id);
      expect(study1Consents.length).to.equal(2);
      study1Consents.forEach(consent => {
        expect(consent.studyId).to.equal(study1Id);
      });
      
      // Verify study2 has 1 consent
      const study2Consents = await consentContract.getConsentsByStudy(study2Id);
      expect(study2Consents.length).to.equal(1);
      expect(study2Consents[0].studyId).to.equal(study2Id);
    });

    it("Should revert for invalid study ID", async function () {
      const { consentContract } = await deployConsentFixture();
      
      // Test with zero study ID
      await expect(consentContract.getConsentsByStudy(0))
        .to.be.revertedWithCustomError(consentContract, "StudyNotAuthorized");
      
      // Test with unauthorized study ID
      const unauthorizedStudyId = ethers.keccak256(ethers.toUtf8Bytes("UnauthorizedStudy"));
      await expect(consentContract.getConsentsByStudy(unauthorizedStudyId))
        .to.be.revertedWithCustomError(consentContract, "StudyNotAuthorized");
    });

    it("Should handle mixed consent states correctly", async function () {
      const { consentContract, patient1, patient2, datasetHash, studyId } = await deployConsentFixture();
      
      // Register both patients
      await consentContract.connect(patient1).registerPatient();
      await consentContract.connect(patient2).registerPatient();
      
      // Grant various consents with different durations
      const shortDuration = 1; // 1 second (will expire)
      const longDuration = 60 * 60 * 24 * 30; // 30 days
      
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, longDuration); // Will stay active
      await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, shortDuration); // Will expire
      await consentContract.connect(patient2).selfGrantConsent(datasetHash, studyId, longDuration); // Will be revoked
      await consentContract.connect(patient2).selfGrantConsent(datasetHash, studyId, longDuration); // Will stay active
      
      // Revoke one consent
      const patient2Id = await consentContract.getPatientId(patient2.address);
      const patient2Consents = await consentContract.getPatientConsents(patient2Id);
      await consentContract.connect(patient2).revokeConsent(patient2Consents[0], patient2Id);
      
      // Advance time to expire short-lived consent
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      // Should only return 2 active consents (1 from patient1, 1 from patient2)
      const consents = await consentContract.getConsentsByStudy(studyId);
      expect(consents.length).to.equal(2);
      
      consents.forEach(consent => {
        expect(consent.isActive).to.be.true;
        expect(consent.studyId).to.equal(studyId);
        expect(consent.revokedAt).to.equal(0);
      });
    });
  });
});