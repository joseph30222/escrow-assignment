const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Escrow", function () {
  async function deployEscrowFixture() {
    const [buyer, seller, arbiter] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy(buyer.address, seller.address, arbiter.address);
    await escrow.waitForDeployment();

    return { escrow, buyer, seller, arbiter };
  }

  describe("Deployment", function () {
    it("Should set the right buyer, seller, and arbiter", async function () {
      const { escrow, buyer, seller, arbiter } = await loadFixture(deployEscrowFixture);
      expect(await escrow.buyer()).to.equal(buyer.address);
      expect(await escrow.seller()).to.equal(seller.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
    });

    it("Should set initial state to AWAITING_PAYMENT", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(await escrow.currentState()).to.equal(0); // AWAITING_PAYMENT
    });
  });

  describe("Deposit", function () {
    it("Should allow buyer to deposit funds", async function () {
      const { escrow, buyer } = await loadFixture(deployEscrowFixture);
      const depositAmount = ethers.parseEther("1");

      await expect(
        escrow.connect(buyer).deposit({ value: depositAmount })
      ).to.changeEtherBalance(escrow, depositAmount);

      expect(await escrow.amount()).to.equal(depositAmount);
      expect(await escrow.currentState()).to.equal(1); // AWAITING_DELIVERY
    });

    it("Should revert if non-buyer tries to deposit", async function () {
      const { escrow, seller } = await loadFixture(deployEscrowFixture);
      await expect(
        escrow.connect(seller).deposit({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Only buyer can call this function");
    });

    it("Should revert if deposit amount is 0", async function () {
      const { escrow, buyer } = await loadFixture(deployEscrowFixture);
      await expect(
        escrow.connect(buyer).deposit({ value: 0 })
      ).to.be.revertedWith("Deposit must be greater than 0");
    });
  });

  describe("Confirm Delivery", function () {
    it("Should allow buyer to confirm delivery and release funds", async function () {
      const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
      const depositAmount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: depositAmount });
      await expect(
        escrow.connect(buyer).confirmDelivery()
      ).to.changeEtherBalance(seller, depositAmount);

      expect(await escrow.fundsReleased()).to.be.true;
      expect(await escrow.currentState()).to.equal(2); // COMPLETE
    });

    it("Should revert if non-buyer tries to confirm delivery", async function () {
      const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
      await escrow.connect(buyer).deposit({ value: ethers.parseEther("1") });
      await expect(
        escrow.connect(seller).confirmDelivery()
      ).to.be.revertedWith("Only buyer can call this function");
    });
  });

  describe("Refund", function () {
    it("Should allow arbiter to refund buyer", async function () {
      const { escrow, buyer, arbiter } = await loadFixture(deployEscrowFixture);
      const depositAmount = ethers.parseEther("1");

      await escrow.connect(buyer).deposit({ value: depositAmount });
      await expect(
        escrow.connect(arbiter).refundBuyer()
      ).to.changeEtherBalance(buyer, depositAmount);

      expect(await escrow.fundsRefunded()).to.be.true;
      expect(await escrow.currentState()).to.equal(3); // REFUNDED
    });

    it("Should revert if non-arbiter tries to refund", async function () {
      const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
      await escrow.connect(buyer).deposit({ value: ethers.parseEther("1") });
      await expect(
        escrow.connect(seller).refundBuyer()
      ).to.be.revertedWith("Only arbiter can call this function");
    });
  });
});