// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Marketplace.sol";
import "./Manager.sol";


contract Task {

    enum TaskState {
        PENDING,
        WAITING_REVIEWER,
        WAITING_FREELANCER,
        STARTED,
        MANAGER_NOTIFIED,
        REVIEW_REQUESTED,
        FINISHED,
        CANCELED,
        FAILED
    }

    Marketplace private marketplace;
    string private description;
    string private domain;
    Manager private manager;
    uint private totalFreelancerBounty;
    uint private currentBounty;
    uint private totalReviewerBounty;
    string private proposedSolution;
    TaskState private taskState;   

    constructor(Marketplace _marketplace, string memory _description, string memory _domain, Manager _manager, uint _totalFreelancerBounty, uint _totalReviewerBounty) {
        require (msg.sender == address(_marketplace));
        
        marketplace = _marketplace;
        description = _description;
        domain = _domain;
        manager = _manager;
        totalFreelancerBounty = _totalFreelancerBounty;
        totalReviewerBounty = _totalReviewerBounty;
        currentBounty = 0;
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

    function evaluateByManager(bool response) public {
        require (msg.sender == address(marketplace), "The evaluation can be updated only by the marketplace");
        require (taskState == TaskState.MANAGER_NOTIFIED, "Evaluation must be done after notifying the manager");

        taskState = response ? TaskState.FINISHED : TaskState.REVIEW_REQUESTED;
    }

    function evaluateByReviewer(bool response) public {
        require (msg.sender == address(marketplace), "The review can be updated only by the marketplace");
        require (taskState == TaskState.REVIEW_REQUESTED, "Review must be done after rejecting the solution by the manager");

        taskState = response ? TaskState.FINISHED : TaskState.FAILED;
    }

    function incrementBounty(int value) public {
        require(msg.sender == address(marketplace), "The bounty can be updated only by the marketplace");
    
        currentBounty = uint(value + int(currentBounty));
        if(currentBounty >= totalReviewerBounty + totalFreelancerBounty)
            taskState = TaskState.WAITING_REVIEWER;
        else
            taskState = TaskState.PENDING;
    }

    function setSolution(string memory _solution) public {
        require (msg.sender == address(marketplace), "The solution can be updated only by the marketplace");
        require (taskState == TaskState.STARTED, "The task has not yet started");

        proposedSolution = _solution;
        taskState = TaskState.MANAGER_NOTIFIED;
    }

    function getSolution() public view returns (string memory) {
        return proposedSolution;
    }

    function getManager() public view returns (Manager) {
        return manager;
    }

    function getTotalBounty() public view returns (uint) {
        return totalFreelancerBounty + totalReviewerBounty;
    }

    function getReviewerBounty() public view returns (uint) {
        return totalReviewerBounty;
    }

    function getFreelancerBounty() public view returns (uint) {
        return totalFreelancerBounty;
    }

    function getDomain() public view returns (string memory) {
        return domain;
    }

    function getDescription() public view returns (string memory) {
        return description;
    }

    function canReceiveFunding() public view returns (bool) {
        return taskState == TaskState.PENDING;
    }

    function getTaskState() public view returns (uint) {
        return uint(taskState);
    }

    function getCurrentBounty() public view returns (uint) {
        return currentBounty;
    }
}