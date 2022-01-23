// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

import "./Task.sol";
import "./Funder.sol";


contract Manager {

    mapping (Task => Funder[]) funders;
    mapping (Task => mapping(Funder => uint)) private donatedSum;
    mapping (Task => uint) private totalSum;

    function initializeTask(string memory description, string memory domain, ERC20 token, uint totalFreelancerBounty, uint totalReviewerBounty) public {
        new Task(description, domain, token, this, totalFreelancerBounty, totalReviewerBounty);
    }

    function provideFunding(Task task) public {
        require (task.canReceiveFunding());
        require (task.isCallerManager());
        require (donatedSum[task][Funder(msg.sender)] == 0);

        uint transferedTokens = task.getToken().allowance(msg.sender, address(this));
        task.getToken().transferFrom(msg.sender, address(this), transferedTokens);

        donatedSum[task][Funder(msg.sender)] = transferedTokens;
        funders[task].push(Funder(msg.sender));

        totalSum[task] += transferedTokens;
        if (totalSum[task] >= task.getTotalBounty()) {
            task.start();
        }
    }

    function retrieveFunding(Task task) public {
        require (task.canReceiveFunding());
        require (task.isCallerManager());
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

    function cancelTask(Task task) public {
        require (task.canReceiveFunding());
        require (task.isCallerManager());

        task.cancel();
        for (uint i = 0; i < funders[task].length; i++) {
            funders[task][i].retrieveFunding(task);
        }
    }
}