// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

import "./Freelancer.sol";
import "./Reviewer.sol";
import "./Manager.sol";
import "./Task.sol";
import "./Funder.sol";


contract Marketplace {

    mapping (Task => Funder[]) funders;
    mapping (Task => Reviewer) reviewers;
    mapping (Task => Freelancer) freelancers;
    mapping (Task => mapping(Funder => uint)) private donatedSum;
    mapping (Task => uint) private totalSum;
    Task[] private waitingFreelancerTasks;

    function initializeTask(string memory description, string memory domain, ERC20 token, Manager manager, uint totalFreelancerBounty, uint totalReviewerBounty) public {
        new Task(this, description, domain, token, manager, totalFreelancerBounty, totalReviewerBounty);
    }

    function provideFunding(Task task, uint tokens) public {
        require (task.canReceiveFunding());
        require (donatedSum[task][Funder(msg.sender)] == 0);

        task.getToken().transferFrom(msg.sender, address(this), tokens);

        donatedSum[task][Funder(msg.sender)] = tokens;
        funders[task].push(Funder(msg.sender));

        totalSum[task] += tokens;
        if (totalSum[task] >= task.getTotalBounty()) {
            task.waitingReviewer();
        }
    }

    function retrieveFunding(Task task) public {
        require (task.canReceiveFunding());
        require (donatedSum[task][Funder(msg.sender)] > 0);

        task.getToken().approve(msg.sender, donatedSum[task][Funder(msg.sender)]);

        totalSum[task] -= donatedSum[task][Funder(msg.sender)];
        for (uint i = 0; i < funders[task].length; i++) {
            if (funders[task][i] == Funder(msg.sender)) {
                delete funders[task][i];
                break;
            }
        }
    }

    function assignReviewer(Task task, Reviewer reviewer) public {
        require (task.getManager() == Manager(msg.sender));
        require (keccak256(bytes(task.getDomain())) == keccak256(bytes(reviewer.getDomain())));

        task.waitingFreelancer();
        reviewers[task] = reviewer;

        waitingFreelancerTasks.push(task);
    }

    function assignFreelancer(Task task, Freelancer freelancer) public {
        for (uint i = 0; i < waitingFreelancerTasks.length; i++) {
            if (waitingFreelancerTasks[i] == task) {
                delete waitingFreelancerTasks[i];
            }
        }

        task.start();
        freelancers[task] = freelancer;
    }

    function cancelTask(Task task) public {
        require (task.getManager() == Manager(msg.sender));

        task.cancel();
        for (uint i = 0; i < funders[task].length; i++) {
            funders[task][i].retrieveFunding(task);
        }
    }

    function getDonatedSum(Task task) public view returns (uint) {
        return donatedSum[task][Funder(msg.sender)];
    }
}