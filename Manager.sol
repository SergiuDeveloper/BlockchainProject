// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

import "./Freelancer.sol";
import "./Marketplace.sol";
import "./Reviewer.sol";
import "./Task.sol";


contract Manager {

    Marketplace private marketplace;

    constructor(Marketplace _marketplace) {
        marketplace = _marketplace;
    }

    function initializeTask(string memory description, string memory domain, ERC20 token, uint totalFreelancerBounty, uint totalReviewerBounty) public {
        marketplace.initializeTask(description, domain, token, this, totalFreelancerBounty, totalReviewerBounty);
    }

    function assignFreelancer(Task task, Freelancer freelancer) public {
        marketplace.assignFreelancer(task, freelancer);
    }

    function assignReviewer(Task task, Reviewer reviewer) public {
        marketplace.assignReviewer(task, reviewer);
    }

    function cancelTask(Task task) public {
        marketplace.cancelTask(task);
    }
}