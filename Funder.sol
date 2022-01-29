// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Marketplace.sol";
import "./Task.sol";
import "./Ownable.sol";


contract Funder is Ownable {

    Marketplace private marketplace;

    constructor(Marketplace _marketplace) {
        marketplace = _marketplace;
    }

    function provideFunding(Task task, uint tokens) public onlyOwner {
        marketplace.getToken().approve(address(marketplace), tokens);
        marketplace.provideFunding(task, tokens);
    }

    function retrieveFunding(Task task, uint tokens) public onlyOwner {
        marketplace.retrieveFunding(task, tokens);
    }

    function getMarketplace() public view returns (Marketplace) {
        return marketplace;
    }
}