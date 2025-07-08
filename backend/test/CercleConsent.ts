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

  async function deployWithConsentToken() {
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
      
      // Test unauthorized user cannot authorize
      const unauthorizedStudyId = ethers.keccak256(ethers.toUtf8Bytes("Study3"));
      await expect(consentContract.connect(patient1).authorizeStudy(unauthorizedStudyId, "Unauthorized study"))
        .to.be.revertedWithCustomError(consentContract, "OwnableUnauthorizedAccount");
      
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
      
      const totalSupply = await consentContract.totalSupply();
      expect(totalSupply).to.equal(1);
      
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
      const { consentContract, patient1, patient2, tokenId, patientId } = await deployWithConsentToken();
      
      // Test unauthorized revocation
      await expect(consentContract.connect(patient2).revokeConsent(tokenId, patientId))
        .to.be.revertedWithCustomError(consentContract, "OnlyOwnerCanRevoke");
      
      // Test successful revocation
      await consentContract.connect(patient1).revokeConsent(tokenId, patientId);
      
      const isValid = await consentContract.isConsentValid(tokenId, patientId);
      expect(isValid).to.be.false;
      
      const updatedConsents = await consentContract.getPatientConsents(patientId);
      expect(updatedConsents.length).to.equal(0);
      
      // Test double revocation
      await expect(consentContract.connect(patient1).revokeConsent(tokenId, patientId))
        .to.be.revertedWithCustomError(consentContract, "ConsentAlreadyRevoked");
    });

    it("Should retrieve consent details and handle edge cases", async function () {
      const { consentContract, datasetHash, studyId, tokenId, patientId } = await deployWithConsentToken();
      
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
      const { consentContract, patient1, patient2, tokenId } = await deployWithConsentToken();
      
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
      const { consentContract, patient1, patient2, tokenId } = await deployWithConsentToken();
      
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
      const { consentContract, patient1, patient2, tokenId } = await deployWithConsentToken();
      
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
});