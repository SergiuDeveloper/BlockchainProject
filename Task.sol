// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

import "./Marketplace.sol";
import "./Manager.sol";


contract Task {

    enum TaskState {
        PENDING,
        WAITING_REVIEWER,
        WAITING_FREELANCER,
        STARTED,
        FINISHED,
        CANCELED
    }

    Marketplace private marketplace;
    string private description;
    string private domain;
    ERC20 token;
    Manager private manager;
    uint private totalFreelancerBounty;
    uint private totalReviewerBounty;
    TaskState private taskState;   

    constructor(Marketplace _marketplace, string memory _description, string memory _domain, ERC20 _token, Manager _manager, uint _totalFreelancerBounty, uint _totalReviewerBounty) {
        require (msg.sender == address(_marketplace));
        
        marketplace = _marketplace;
        description = _description;
        domain = _domain;
        token = _token;
        manager = _manager;
        totalFreelancerBounty = _totalFreelancerBounty;
        totalReviewerBounty = _totalReviewerBounty;
        taskState = TaskState.PENDING;
    }

    function start() public {
        require (msg.sender == address(marketplace));
        require (taskState == TaskState.WAITING_FREELANCER);

        taskState = TaskState.STARTED;
    }

    function waitingFreelancer() public {
        require (msg.sender == address(marketplace));
        require (taskState == TaskState.WAITING_REVIEWER);

        taskState = TaskState.WAITING_FREELANCER;
    }

    function waitingReviewer() public {
        require (msg.sender == address(marketplace));
        require (taskState == TaskState.PENDING);

        taskState = TaskState.WAITING_REVIEWER;
    }

    function cancel() public {
        require (msg.sender == address(marketplace));
        require (taskState == TaskState.PENDING || taskState == TaskState.WAITING_REVIEWER);

        taskState = TaskState.CANCELED;
    }

    function getManager() public view returns (Manager) {
        return manager;
    }

    function getTotalBounty() public view returns (uint) {
        return totalFreelancerBounty + totalReviewerBounty;
    }

    function getToken() public view returns (ERC20) {
        return token;
    }

    function getDomain() public view returns (string memory) {
        return domain;
    }

    function canReceiveFunding() public view returns (bool) {
        return taskState == TaskState.PENDING;
    }
}