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
    // Contract deployment
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const patient1 = signers[1];
    const patient2 = signers[2];

    const ConsentFactory = await ethers.getContractFactory("CercleConsent");
    const consentContract = await ConsentFactory.deploy(owner.address) as CercleConsent;

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

    it("Should retrieve patient information", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await consentContract.connect(patient1).registerPatient();
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientInfo = await consentContract.getPatientInfo(patientId);
      
      expect(patientInfo[0]).to.equal(patient1.address); // walletAddress
      expect(patientInfo[1]).to.be.gt(0); // registrationDate
      expect(patientInfo[2]).to.be.true; // isActive
      expect(patientInfo[3]).to.be.an('array'); // consentIds
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
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      expect(patientConsents.length).to.equal(1);

      // Verify that the consent is valid
      const tokenId = patientConsents[0];
      const isValid = await consentContract.isConsentValid(tokenId, patientId);
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

      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      const tokenId = patientConsents[0];
      
      await consentContract.connect(patient1).revokeConsent(tokenId, patientId);
      
      // Verify that the consent is no longer valid
      const isValid = await consentContract.isConsentValid(tokenId, patientId);
      expect(isValid).to.be.false;
      
      // Verify that the consent has been removed from the patient's list
      const updatedConsents = await consentContract.getPatientConsents(patientId);
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

      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      const tokenId = patientConsents[0];
      
      // Patient2 tries to revoke patient1's consent
      await expect(consentContract.connect(patient2).revokeConsent(tokenId, patientId))
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

      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      const tokenId = patientConsents[0];
      const consentDetails = await consentContract.getConsentDetails(tokenId, patientId);
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
      const patientId = await consentContract.getPatientId(patient1.address);
      const patientConsents = await consentContract.getPatientConsents(patientId);
      expect(patientConsents.length).to.equal(1);
    });

    it("Should not allow a non-owner to pause the contract", async function () {
      const { consentContract, patient1 } = await deployConsentFixture();
      await expect(consentContract.connect(patient1).pause())
        .to.be.revertedWithCustomError(consentContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Soul Bound Token (SBT) Features", function () {
    async function deployConsentWithRegisteredPatientAndTokenFixture() {
      const baseFixture = await deployConsentFixture();
      await baseFixture.consentContract.connect(baseFixture.patient1).registerPatient();
      await baseFixture.consentContract.connect(baseFixture.patient2).registerPatient();
      
      // Grant a consent token to patient1
      const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
      await baseFixture.consentContract.connect(baseFixture.patient1).selfGrantConsent(
        baseFixture.datasetHash,
        baseFixture.studyId,
        validityDuration
      );
      
      const patientId = await baseFixture.consentContract.getPatientId(baseFixture.patient1.address);
      const patientConsents = await baseFixture.consentContract.getPatientConsents(patientId);
      const tokenId = patientConsents[0];
      
      return { ...baseFixture, tokenId, patientId };
    }

    describe("Transfer restrictions", function () {
      it("Should reject transferFrom attempts", async function () {
        const { consentContract, patient1, patient2, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        await expect(
          consentContract.connect(patient1).transferFrom(patient1.address, patient2.address, tokenId)
        ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
      });

      it("Should reject safeTransferFrom attempts (without data)", async function () {
        const { consentContract, patient1, patient2, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        await expect(
          consentContract.connect(patient1)["safeTransferFrom(address,address,uint256)"](
            patient1.address, 
            patient2.address, 
            tokenId
          )
        ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
      });

      it("Should reject safeTransferFrom attempts (with data)", async function () {
        const { consentContract, patient1, patient2, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        await expect(
          consentContract.connect(patient1)["safeTransferFrom(address,address,uint256,bytes)"](
            patient1.address, 
            patient2.address, 
            tokenId,
            "0x"
          )
        ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
      });

      it("Should reject transfers even from approved addresses", async function () {
        const { consentContract, patient1, patient2, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        // Even if we could approve (which we can't), transfers should still fail
        await expect(
          consentContract.connect(patient2).transferFrom(patient1.address, patient2.address, tokenId)
        ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
      });
    });

    describe("Approval restrictions", function () {
      it("Should reject approve attempts", async function () {
        const { consentContract, patient1, patient2, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        await expect(
          consentContract.connect(patient1).approve(patient2.address, tokenId)
        ).to.be.revertedWith("CERCONSENT: Les approbations sont interdites");
      });

      it("Should reject setApprovalForAll attempts", async function () {
        const { consentContract, patient1, patient2 } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        await expect(
          consentContract.connect(patient1).setApprovalForAll(patient2.address, true)
        ).to.be.revertedWith("CERCONSENT: Les approbations sont interdites");
      });

      it("Should always return address(0) for getApproved", async function () {
        const { consentContract, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        const approved = await consentContract.getApproved(tokenId);
        expect(approved).to.equal(ethers.ZeroAddress);
      });

      it("Should always return false for isApprovedForAll", async function () {
        const { consentContract, patient1, patient2 } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        const isApproved = await consentContract.isApprovedForAll(patient1.address, patient2.address);
        expect(isApproved).to.be.false;
      });
    });

    describe("Token ownership verification", function () {
      it("Should maintain correct ownership after minting", async function () {
        const { consentContract, patient1, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        const owner = await consentContract.ownerOf(tokenId);
        expect(owner).to.equal(patient1.address);
      });

      it("Should maintain ownership even after failed transfer attempts", async function () {
        const { consentContract, patient1, patient2, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        // Try to transfer (should fail)
        await expect(
          consentContract.connect(patient1).transferFrom(patient1.address, patient2.address, tokenId)
        ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
        
        // Verify ownership hasn't changed
        const owner = await consentContract.ownerOf(tokenId);
        expect(owner).to.equal(patient1.address);
      });

      it("Should correctly report balance after minting", async function () {
        const { consentContract, patient1, patient2 } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        const balance1 = await consentContract.balanceOf(patient1.address);
        const balance2 = await consentContract.balanceOf(patient2.address);
        
        expect(balance1).to.equal(1);
        expect(balance2).to.equal(0);
      });
    });

    describe("CERCONSENT compliance verification", function () {
      it("Should support ERC721 interface", async function () {
        const { consentContract } = await deployConsentFixture();
        
        // ERC721 interface ID: 0x80ac58cd
        const supportsERC721 = await consentContract.supportsInterface("0x80ac58cd");
        expect(supportsERC721).to.be.true;
      });

      it("Should allow minting new tokens", async function () {
        const { consentContract, patient1, datasetHash, studyId } = await deployConsentFixture();
        await consentContract.connect(patient1).registerPatient();
        
        const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
        
        await expect(
          consentContract.connect(patient1).selfGrantConsent(
            datasetHash,
            studyId,
            validityDuration
          )
        ).to.not.be.reverted;
        
        const patientId = await consentContract.getPatientId(patient1.address);
        const patientConsents = await consentContract.getPatientConsents(patientId);
        expect(patientConsents.length).to.equal(1);
      });

      it("Should allow token revocation (marking as inactive)", async function () {
        const { consentContract, patient1, tokenId, patientId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        // Verify token is initially valid
        const isValidBefore = await consentContract.isConsentValid(tokenId, patientId);
        expect(isValidBefore).to.be.true;
        
        // Revoke the consent
        await consentContract.connect(patient1).revokeConsent(tokenId, patientId);
        
        // Verify token is no longer valid
        const isValidAfter = await consentContract.isConsentValid(tokenId, patientId);
        expect(isValidAfter).to.be.false;
      });

      it("Should maintain token existence even after revocation", async function () {
        const { consentContract, patient1, tokenId, patientId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        // Revoke the consent
        await consentContract.connect(patient1).revokeConsent(tokenId, patientId);
        
        // Token should still exist (owner should still be patient1)
        const owner = await consentContract.ownerOf(tokenId);
        expect(owner).to.equal(patient1.address);
        
        // But consent should be marked as inactive
        const consentDetails = await consentContract.getConsentDetails(tokenId, patientId);
        expect(consentDetails.isActive).to.be.false;
        expect(consentDetails.revokedAt).to.be.gt(0);
      });
    });

    describe("Edge cases and security", function () {
      it("Should prevent transfers even by contract owner", async function () {
        const { consentContract, owner, patient1, patient2, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        await expect(
          consentContract.connect(owner).transferFrom(patient1.address, patient2.address, tokenId)
        ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
      });

      it("Should prevent self-transfers", async function () {
        const { consentContract, patient1, tokenId } = await deployConsentWithRegisteredPatientAndTokenFixture();
        
        await expect(
          consentContract.connect(patient1).transferFrom(patient1.address, patient1.address, tokenId)
        ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
      });

      it("Should handle multiple tokens per patient correctly", async function () {
        const { consentContract, patient1, datasetHash, studyId } = await deployConsentFixture();
        await consentContract.connect(patient1).registerPatient();
        
        const validityDuration = 60 * 60 * 24 * 30; // 30 days in seconds
        
        // Grant multiple consents
        await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
        await consentContract.connect(patient1).selfGrantConsent(datasetHash, studyId, validityDuration);
        
        const patientId = await consentContract.getPatientId(patient1.address);
        const patientConsents = await consentContract.getPatientConsents(patientId);
        expect(patientConsents.length).to.equal(2);
        
        // Both tokens should be non-transferable
        for (const tokenId of patientConsents) {
          await expect(
            consentContract.connect(patient1).transferFrom(patient1.address, patient1.address, tokenId)
          ).to.be.revertedWith("CERCONSENT: Les transferts sont interdits");
        }
      });
    });
  });
});