// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Freelancer.sol";
import "./Marketplace.sol";
import "./Reviewer.sol";
import "./Task.sol";
import "./Ownable.sol";

contract Manager is Ownable {
    Marketplace private marketplace;

    constructor(Marketplace _marketplace) {
        marketplace = _marketplace;
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

    function getMarketplace() public view returns (Marketplace) {
        return marketplace;
    }
    
}