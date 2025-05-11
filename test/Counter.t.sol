// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    function setUp() public {
        counter = new Counter();
        counter.get();
    }

    function test_Increment() public {
        counter.inc();
        assertEq(counter.count(), 1);
    }

    function test_Decrement() public {
        counter.inc();
        counter.dec();
        assertEq(counter.count(), 0);
    }
}
