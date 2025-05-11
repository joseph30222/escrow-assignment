// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

contract Escrow {
    address public buyer;
    address public seller;
    address public arbiter;
    uint256 public amount;
    bool public fundsReleased;
    bool public fundsRefunded;

    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, COMPLETE, REFUNDED }
    State public currentState;

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this function");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can call this function");
        _;
    }

    modifier inState(State _state) {
        require(currentState == _state, "Invalid state");
        _;
    }

    constructor(address _buyer, address _seller, address _arbiter) {
        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
        currentState = State.AWAITING_PAYMENT;
    }

    function deposit() external payable onlyBuyer inState(State.AWAITING_PAYMENT) {
        require(msg.value > 0, "Deposit must be greater than 0");
        amount = msg.value;
        currentState = State.AWAITING_DELIVERY;
    }

    function confirmDelivery() external onlyBuyer inState(State.AWAITING_DELIVERY) {
        fundsReleased = true;
        currentState = State.COMPLETE;
        payable(seller).transfer(amount);
    }

    function refundBuyer() external onlyArbiter inState(State.AWAITING_DELIVERY) {
        fundsRefunded = true;
        currentState = State.REFUNDED;
        payable(buyer).transfer(amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}