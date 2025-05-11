const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("Escrow Fuzz Testing", function () {
  async function deployEscrowFixture() {
    const [buyer, seller, arbiter, attacker] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy(buyer.address, seller.address, arbiter.address);
    await escrow.waitForDeployment();

    return { escrow, buyer, seller, arbiter, attacker };
  }

  it("Should handle random deposit amounts", async function () {
    const { buyer, seller, arbiter } = await loadFixture(deployEscrowFixture);
    const Escrow = await ethers.getContractFactory("Escrow");

    for (let i = 0; i < 10; i++) {
      // Deploy a fresh contract for each iteration to reset state
      const escrow = await Escrow.deploy(buyer.address, seller.address, arbiter.address);
      await escrow.waitForDeployment();

      const randomAmount = ethers.parseEther((Math.random() * 10).toString());

      await expect(
        escrow.connect(buyer).deposit({ value: randomAmount })
      ).to.changeEtherBalance(escrow, randomAmount);

      expect(await escrow.amount()).to.equal(randomAmount);
      expect(await escrow.currentState()).to.equal(1); // AWAITING_DELIVERY
    }
  });

  it("Should prevent unauthorized access", async function () {
    const { escrow, buyer, attacker } = await loadFixture(deployEscrowFixture);
    const depositAmount = ethers.parseEther("1");

    // Ensure buyer deposit works
    await expect(
      escrow.connect(buyer).deposit({ value: depositAmount })
    ).to.changeEtherBalance(escrow, depositAmount);

    // Verify attacker signer is valid
    expect(attacker.address).to.be.properAddress;
    expect(attacker.provider).to.not.be.undefined;

    // Connect contract to attacker signer explicitly
    const escrowAsAttacker = escrow.connect(attacker);

    // Try unauthorized actions
    for (let i = 0; i < 5; i++) {
      await expect(
        escrowAsAttacker.confirmDelivery()
      ).to.be.revertedWith("Only buyer can call this function");

      await expect(
        escrowAsAttacker.refundBuyer()
      ).to.be.revertedWith("Only arbiter can call this function");
    }
  });

  it("Should maintain state consistency", async function () {
    const { escrow, buyer, arbiter } = await loadFixture(deployEscrowFixture);
    const depositAmount = ethers.parseEther("1");

    await escrow.connect(buyer).deposit({ value: depositAmount });

    // Try multiple refund attempts
    await escrow.connect(arbiter).refundBuyer();
    
    for (let i = 0; i < 3; i++) {
      await expect(
        escrow.connect(arbiter).refundBuyer()
      ).to.be.revertedWith("Invalid state");
      
      await expect(
        escrow.connect(buyer).confirmDelivery()
      ).to.be.revertedWith("Invalid state");
    }
  });
});