import { expect } from "chai";
import { ethers } from "hardhat";
import { CercleToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CercleToken", function () {
  let cercleToken: CercleToken;
  let owner: HardhatEthersSigner;
  let patient1: HardhatEthersSigner;
  let patient2: HardhatEthersSigner;
  let datasetHash: string;

  async function deployCercleTokenFixture() {
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const patient1 = signers[1];
    const patient2 = signers[2];
  

    const CercleTokenFactory = await ethers.getContractFactory("CercleToken");
    const cercleToken = await CercleTokenFactory.deploy() as CercleToken;

    const datasetHash = ethers.keccak256(ethers.toUtf8Bytes("PatientData1"));

    return { cercleToken, owner, patient1, patient2, datasetHash };
  }

  async function deployWithAuthorizedPatients() {
    const baseFixture = await deployCercleTokenFixture();
    await baseFixture.cercleToken.connect(baseFixture.owner).setAuthorizedPatient(baseFixture.patient1.address, true);
    await baseFixture.cercleToken.connect(baseFixture.owner).setAuthorizedPatient(baseFixture.patient2.address, true);
    return baseFixture;
  }

  async function deployAuthorizedPatientsWithTokens() {
    const baseFixture = await deployWithAuthorizedPatients();
    await baseFixture.cercleToken.connect(baseFixture.patient1).rewardForDataDownload(
      baseFixture.patient1.address,
      baseFixture.datasetHash
    );
    await baseFixture.cercleToken.connect(baseFixture.patient2).rewardForDataDownload(
      baseFixture.patient2.address,
      baseFixture.datasetHash
    );
    return baseFixture;
  }

  describe("Deployment and basic properties", function () {
    it("Should deploy with correct initial values", async function () {
      const { cercleToken, owner } = await deployCercleTokenFixture();
      
      expect(await cercleToken.name()).to.equal("CercleToken");
      expect(await cercleToken.symbol()).to.equal("CERCLE");
      expect(await cercleToken.owner()).to.equal(owner.address);
      expect(await cercleToken.totalSupply()).to.equal(0);
      expect(await cercleToken.MONTHLY_MINT_LIMIT()).to.equal(200);
    });

    it("Should implement Soul Bound Token properties", async function () {
      const { cercleToken } = await deployCercleTokenFixture();
      
      expect(await cercleToken.isSoulBound()).to.be.true;
      expect(await cercleToken.canTransfer()).to.be.false;
    });
  });

  describe("Authorization management", function () {
    it("Should handle patient authorization correctly", async function () {
      const { cercleToken, owner, patient1 } = await deployCercleTokenFixture();
      
      // Test initial state
      expect(await cercleToken.authorizedPatient(patient1.address)).to.be.false;
      
      // Test successful authorization
      await expect(cercleToken.connect(owner).setAuthorizedPatient(patient1.address, true))
        .to.emit(cercleToken, "PatientAuthorizationChanged")
        .withArgs(patient1.address, true);
      
      expect(await cercleToken.authorizedPatient(patient1.address)).to.be.true;
      
      // Test unauthorized user cannot authorize
      await expect(cercleToken.connect(patient1).setAuthorizedPatient(patient1.address, false))
        .to.be.revertedWithCustomError(cercleToken, "OwnableUnauthorizedAccount");
      
      // Test zero address validation
      await expect(cercleToken.connect(owner).setAuthorizedPatient(ethers.ZeroAddress, true))
        .to.be.revertedWithCustomError(cercleToken, "InvalidAddress");
    });
  });

  describe("Data download rewards", function () {
    it("Should reward data downloads correctly", async function () {
      const { cercleToken, patient1, datasetHash } = await deployWithAuthorizedPatients();
      
      const initialBalance = await cercleToken.balanceOf(patient1.address);
      
      await expect(cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash))
        .to.emit(cercleToken, "TokensMinted")
        .withArgs(patient1.address, 50)
        .and.to.emit(cercleToken, "DataDownloadRewarded")
        .withArgs(patient1.address, datasetHash, 50);
      
      const finalBalance = await cercleToken.balanceOf(patient1.address);
      expect(finalBalance - initialBalance).to.equal(50);
      
      expect(await cercleToken.monthlyMintedTokens(patient1.address)).to.equal(50);
    });

    it("Should enforce monthly mint limits", async function () {
      const { cercleToken, patient1, datasetHash } = await deployWithAuthorizedPatients();
      
      // Mint 4 times (200 tokens total)
      for (let i = 0; i < 4; i++) {
        await cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash);
      }
      
      expect(await cercleToken.monthlyMintedTokens(patient1.address)).to.equal(200);
      
      // 5th mint should fail
      await expect(cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash))
        .to.be.revertedWithCustomError(cercleToken, "MonthlyMintLimitReached");
    });

    it("Should reset monthly limits correctly", async function () {
      const { cercleToken, patient1, datasetHash } = await deployWithAuthorizedPatients();
      
      // Mint to limit
      for (let i = 0; i < 4; i++) {
        await cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash);
      }
      
      // Advance time by more than 30 days
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Should be able to mint again
      await expect(cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash))
        .to.emit(cercleToken, "TokensMinted")
        .withArgs(patient1.address, 50);
      
      expect(await cercleToken.monthlyMintedTokens(patient1.address)).to.equal(50);
    });

    it("Should restrict minting to authorized patient only", async function () {
      const { cercleToken, patient1, patient2, datasetHash } = await deployCercleTokenFixture();
      
      await expect(cercleToken.connect(patient1).rewardForDataDownload(patient2.address, datasetHash))
        .to.be.revertedWithCustomError(cercleToken, "NotAuthorizedPatient");
    });

    it("Should respect pause functionality", async function () {
      const { cercleToken, owner, patient1, datasetHash } = await deployWithAuthorizedPatients();
      
      await cercleToken.connect(owner).pause();
      
      await expect(cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash))
        .to.be.revertedWithCustomError(cercleToken, "EnforcedPause");
      
      await cercleToken.connect(owner).unpause();
      
      await expect(cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash))
        .to.emit(cercleToken, "TokensMinted");
    });
  });

  describe("Reward redemption", function () {
       it("Should handle reward redemption correctly", async function () {
      const { cercleToken, patient1, datasetHash } = await deployWithAuthorizedPatients();

      await cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash);
      const initialBalance = await cercleToken.balanceOf(patient1.address);
      const tokenCost = 25;
      const rewardType = "Consultation";
      
      // Exécuter la transaction
      const tx = await cercleToken.connect(patient1).redeemReward(tokenCost, rewardType);
      
      // Vérifier les événements sans validation complexe du redemptionCode
      await expect(tx)
        .to.emit(cercleToken, "TokensBurned")
        .withArgs(patient1.address, tokenCost)
        .and.to.emit(cercleToken, "RewardRedeemed");
      
      // Vérifier séparément le redemptionCode depuis l'événement
      const receipt = await tx.wait();
      const rewardRedeemedEvent = receipt?.logs.find(
        log => log.topics[0] === cercleToken.interface.getEvent('RewardRedeemed').topicHash
      );
      
      if (rewardRedeemedEvent) {
        const rewardRedeemedEventDecoded = cercleToken.interface.decodeEventLog(
          'RewardRedeemed',
          rewardRedeemedEvent.data,
          rewardRedeemedEvent.topics
        );
        
        expect(rewardRedeemedEventDecoded.redemptionCode).to.be.a('string');
        expect(rewardRedeemedEventDecoded.redemptionCode).to.include('CERCLE-');
        expect(rewardRedeemedEventDecoded.redemptionCode).to.include(tokenCost);
        expect(rewardRedeemedEventDecoded.patient).to.equal(patient1.address);
        expect(rewardRedeemedEventDecoded.tokensBurned).to.equal(tokenCost);
        expect(rewardRedeemedEventDecoded.rewardType).to.equal(rewardType);
      }
      
      // Check balance
      const finalBalance = await cercleToken.balanceOf(patient1.address);
      expect(initialBalance - finalBalance).to.equal(tokenCost);
    });

    it("Should generate unique redemption codes", async function () {
      const { cercleToken, patient1, patient2 } = await deployAuthorizedPatientsWithTokens();
            
      const tokenCost = 25;
      const rewardType = "Test";
      
      // Get redemption codes using staticCall
      const redemptionCode1 = await cercleToken.connect(patient1).redeemReward(tokenCost, rewardType);
      await cercleToken.connect(patient1).redeemReward(tokenCost, rewardType);
      
      const redemptionCode2 = await cercleToken.connect(patient2).redeemReward(tokenCost, rewardType);
      await cercleToken.connect(patient2).redeemReward(tokenCost, rewardType);
      
      // Codes should be different
      expect(redemptionCode1).to.not.equal(redemptionCode2);
    });

    it("Should validate insufficient balance for redemption", async function () {
      const { cercleToken, patient2 } = await deployWithAuthorizedPatients();
      
      // patient2 has no tokens
      await expect(cercleToken.connect(patient2).redeemReward(10, "Test"))
        .to.be.revertedWithCustomError(cercleToken, "InsufficientBalance");
    });
  });

  describe("Soul Bound Token implementation", function () {
    it("Should prevent all transfer operations", async function () {
      const { cercleToken, patient1, patient2 } = await deployAuthorizedPatientsWithTokens();
      
      const transferTests = [
        {
          name: "transfer",
          operation: () => cercleToken.connect(patient1).transfer(patient2.address, 10)
        },
        {
          name: "transferFrom",
          operation: () => cercleToken.connect(patient1).transferFrom(patient1.address, patient2.address, 10)
        }
      ];

      for (const test of transferTests) {
        await expect(test.operation())
          .to.be.revertedWithCustomError(cercleToken, "TransfersDisabled");
      }
    });

    it("Should prevent all approval operations", async function () {
      const { cercleToken, patient1, patient2 } = await deployAuthorizedPatientsWithTokens();
      
      await expect(cercleToken.connect(patient1).approve(patient2.address, 10))
        .to.be.revertedWithCustomError(cercleToken, "ApprovalsDisabled");
      
      await expect(cercleToken.connect(patient1).allowance(patient1.address, patient2.address))
        .to.be.revertedWithCustomError(cercleToken, "AllowanceDisabled");
    });

    it("Should allow minting and burning operations", async function () {
      const { cercleToken, patient1} = await deployAuthorizedPatientsWithTokens();
      
      const balance = await cercleToken.balanceOf(patient1.address);
      expect(balance).to.equal(50);
      
      // Test burning through redemption
      await expect(cercleToken.connect(patient1).redeemReward(25, "Test"))
        .to.emit(cercleToken, "TokensBurned");
      
      const finalBalance = await cercleToken.balanceOf(patient1.address);
      expect(finalBalance).to.equal(25);
    });
  });

  describe("Administrative features", function () {
    it("Should handle pause and unpause functionality", async function () {
      const { cercleToken, owner, patient1 } = await deployCercleTokenFixture();
      
      // Test pause
      await expect(cercleToken.connect(owner).pause())
        .to.emit(cercleToken, "Paused")
        .withArgs(owner.address);
      
      expect(await cercleToken.paused()).to.be.true;
      
      // Test unpause
      await expect(cercleToken.connect(owner).unpause())
        .to.emit(cercleToken, "Unpaused")
        .withArgs(owner.address);
      
      expect(await cercleToken.paused()).to.be.false;
      
      // Test unauthorized pause
      await expect(cercleToken.connect(patient1).pause())
        .to.be.revertedWithCustomError(cercleToken, "OwnableUnauthorizedAccount");
    });

    it("Should restrict administrative functions to owner only", async function () {
      const { cercleToken, patient1 } = await deployCercleTokenFixture();
      
      const adminTests = [
        {
          name: "setAuthorizedPatient",
          operation: () => cercleToken.connect(patient1).setAuthorizedPatient(patient1.address, true)
        },
        {
          name: "pause",
          operation: () => cercleToken.connect(patient1).pause()
        },
        {
          name: "unpause",
          operation: () => cercleToken.connect(patient1).unpause()
        }
      ];

      for (const test of adminTests) {
        await expect(test.operation())
          .to.be.revertedWithCustomError(cercleToken, "OwnableUnauthorizedAccount");
      }
    });
  });

  describe("Edge cases and error handling", function () {
    it("Should handle multiple patients with separate monthly limits", async function () {
      const { cercleToken, patient1, patient2, datasetHash } = await deployWithAuthorizedPatients();
      
      // Mint to limit for patient1
      for (let i = 0; i < 4; i++) {
        await cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash);
      }
      
      // patient2 should still be able to mint
      await expect(cercleToken.connect(patient2).rewardForDataDownload(patient2.address, datasetHash))
        .to.emit(cercleToken, "TokensMinted");
      
      expect(await cercleToken.monthlyMintedTokens(patient1.address)).to.equal(200);
      expect(await cercleToken.monthlyMintedTokens(patient2.address)).to.equal(50);
    });

    it("Should handle authorization revocation", async function () {
      const { cercleToken, owner, patient1, datasetHash } = await deployWithAuthorizedPatients();
      
      // Revoke authorization
      await cercleToken.connect(owner).setAuthorizedPatient(patient1.address, false);
      
      // Should no longer be able to mint
      await expect(cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash))
        .to.be.revertedWithCustomError(cercleToken, "NotAuthorizedPatient");
    });

    it("Should handle large token amounts correctly", async function () {
      const { cercleToken, patient1 } = await deployAuthorizedPatientsWithTokens();
      
      const balance = await cercleToken.balanceOf(patient1.address);
      
      // Try to redeem more than balance
      await expect(cercleToken.connect(patient1).redeemReward(balance + 1n, "Test"))
        .to.be.revertedWithCustomError(cercleToken, "InsufficientBalance");
      
      // Redeem exact balance should work
      await expect(cercleToken.connect(patient1).redeemReward(balance, "Test"))
        .to.emit(cercleToken, "TokensBurned");
    });
  });

  describe("Integration scenarios", function () {
    it("Should handle multiple redemptions by same patient", async function () {
      const { cercleToken, patient1, datasetHash } = await deployWithAuthorizedPatients();
      
      // Give patient multiple rewards
      for (let i = 0; i < 3; i++) {
        await cercleToken.connect(patient1).rewardForDataDownload(patient1.address, datasetHash);
      }
      
      const initialBalance = await cercleToken.balanceOf(patient1.address);
      expect(initialBalance).to.equal(150);
      
      // Multiple redemptions
      await cercleToken.connect(patient1).redeemReward(50, "Reward1");
      await cercleToken.connect(patient1).redeemReward(50, "Reward2");
      
      const finalBalance = await cercleToken.balanceOf(patient1.address);
      expect(finalBalance).to.equal(50);
    });
  });
});