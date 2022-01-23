// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

import "./Manager.sol";


contract Task {

    enum TaskState {
        PENDING,
        STARTED,
        FINISHED,
        CANCELED
    }

    string private description;
    string private domain;
    ERC20 token;
    Manager private manager;
    uint private totalFreelancerBounty;
    uint private totalReviewerBounty;
    TaskState private taskState;   

    constructor(string memory _description, string memory _domain, ERC20 _token, Manager _manager, uint _totalFreelancerBounty, uint _totalReviewerBounty) {
        require (msg.sender == address(_manager));
        
        description = _description;
        domain = _domain;
        token = _token;
        manager = _manager;
        totalFreelancerBounty = _totalFreelancerBounty;
        totalReviewerBounty = _totalReviewerBounty;
        taskState = TaskState.PENDING;
    }

    function start() public {
        require (msg.sender == address(manager));

        taskState = TaskState.STARTED;
    }

    function cancel() public {
        require (msg.sender == address(manager));

        taskState = TaskState.CANCELED;
    }

    function getTotalBounty() public view returns (uint) {
        return totalFreelancerBounty + totalReviewerBounty;
    }

    function getToken() public view returns (ERC20) {
        return token;
    }

    function getManager() public view returns (Manager) {
        return manager;
    }

    function isCallerManager() public view returns (bool) {
        return address(manager) == msg.sender;
    }

    function canReceiveFunding() public view returns (bool) {
        return taskState == TaskState.PENDING;
    }
}