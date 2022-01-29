// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Marketplace.sol";
import "./Ownable.sol";
import "./Task.sol";

contract Reviewer is Ownable {
    Marketplace private marketplace;
    string private domain;

    constructor(Marketplace _marketplace, string memory _domain)  {
        marketplace = _marketplace;
        domain = _domain;
    }

    function reviewSolution(Task task, bool accepted) public onlyOwner {
        marketplace.review(task, accepted);
    }
    
    function getDomain() public view returns (string memory) {
        return domain;
    }

    function getMarketplace() public view returns (Marketplace) {
        return marketplace;
    }
}