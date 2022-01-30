// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Marketplace.sol";
import "./Ownable.sol";
import "./Task.sol";

// account types
// 0 - managers
// 1 - funders
// 2 - reviewers
// 3 - freelancers
abstract contract Account is Ownable {    
    Marketplace internal marketplace;
    uint internal accountType;
    string internal name;

    constructor(Marketplace _marketplace, string memory _name) {
        marketplace = _marketplace;
        name = _name;
    }

    function getMarketplace() public view returns (Marketplace) {
        return marketplace;
    }

    function getAccountType() public view returns (uint) {
        return accountType;
    }

    function getName() public view returns (string memory) {
        return name;
    }
}

contract Manager is Account {
    constructor(Marketplace _marketplace, string memory _name) Account(_marketplace, _name) {
        accountType = 0;
    }

    function initializeTask(string memory description, string memory domain, uint totalFreelancerBounty, uint totalReviewerBounty) public onlyOwner {
        marketplace.initializeTask(description, domain, totalFreelancerBounty, totalReviewerBounty);
    }

    function assignFreelancer(Task task, Freelancer freelancer) public onlyOwner {
        marketplace.assignFreelancer(task, freelancer);
    }

    function assignReviewer(Task task, Reviewer reviewer) public onlyOwner {
        marketplace.assignReviewer(task, reviewer);
    }

    function cancelTask(Task task) public onlyOwner {
        marketplace.cancelTask(task);
    }

    function evaluateSolution(Task task, bool accepted) public onlyOwner {
        marketplace.evaluate(task, accepted);
    }
}

contract Funder is Account {
    constructor(Marketplace _marketplace, string memory _name) Account(_marketplace, _name) {
        accountType = 1;
    }

    function provideFunding(Task task, uint tokens) public onlyOwner {
        marketplace.getToken().approve(address(marketplace), tokens);
        marketplace.provideFunding(task, tokens);
    }

    function retrieveFunding(Task task, uint tokens) public onlyOwner {
        marketplace.retrieveFunding(task, tokens);
    }

    function getDonatedSum(Task task) public view returns (uint) {
        return marketplace.getDonatedSum(task);
    }
}

contract Reviewer is Account {
    string private domain;

    constructor(Marketplace _marketplace, string memory _name, string memory _domain) Account(_marketplace, _name) {
        accountType = 2;
        domain = _domain;
    }

    function reviewSolution(Task task, bool accepted) public onlyOwner {
        marketplace.review(task, accepted);
    }
    
    function getDomain() public view returns (string memory) {
        return domain;
    }
}

contract Freelancer is Account {
    string private domain;
    uint reputation;

    constructor(Marketplace _marketplace, string memory _name, string memory _domain) Account(_marketplace, _name) {
        accountType = 3;
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
}