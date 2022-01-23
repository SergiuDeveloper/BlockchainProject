// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Marketplace.sol";
import "./Task.sol";


contract Funder {

    Marketplace private marketplace;

    constructor(Marketplace _marketplace) {
        marketplace = _marketplace;
    }

    function provideFunding(Task task, uint tokens) public {
        require (task.getToken().balanceOf(address(this)) >= tokens);

        task.getToken().approve(address(marketplace), tokens);
        marketplace.provideFunding(task, tokens);
    }

    function retrieveFunding(Task task) public {
        marketplace.retrieveFunding(task);

        task.getToken().transferFrom(address(marketplace), address(this), marketplace.getDonatedSum(task));

        marketplace.retrieveFunding(task);
    }
}