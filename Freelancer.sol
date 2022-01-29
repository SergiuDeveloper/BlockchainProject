// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Marketplace.sol";
import "./Ownable.sol";

contract Freelancer is Ownable {
    Marketplace internal marketplace;
    string private domain;
    uint reputation;

    constructor(Marketplace _marketplace, string memory _domain)  {
        marketplace = _marketplace;
        domain = _domain;
        reputation = 5;
    }

    function bid(Task task) public onlyOwner {
        marketplace.getToken().approve(address(marketplace), task.getReviewerBounty()); // aprove the sending the warranty to marketplace address
        marketplace.bid(task);
    }

    function notifyManager(Task task, string memory solution) public onlyOwner {
        marketplace.notifyManager(task, solution);
    }

    function incrementReputation() public {
        require(msg.sender == address(marketplace), "Only the marketplace can change the freelancer reputation");

        if(reputation < 10)
            reputation += 1;
    }

    function decrementReputation() public {
        require(msg.sender == address(marketplace), "Only the marketplace can change the freelancer reputation");

        if(reputation > 1)
            reputation -= 1;
    }
    
    function getReputation() public view returns (uint) {
        return reputation;
    }

    function getDomain() public view returns (string memory) {
        return domain;
    }

    function getMarketplace() public view returns (Marketplace) {
        return marketplace;
    }
}