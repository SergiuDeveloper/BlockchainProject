// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Accounts.sol";
import "./Token.sol";
import "./Task.sol";

contract Marketplace {
    FIIToken token;
    mapping(address => address) owners;
    mapping(Task => Funder[]) funders;
    mapping(Task => Reviewer) reviewers;
    mapping(Task => Freelancer) freelancers;
    mapping(Task => Freelancer[]) bidders;
    mapping(Task => mapping(Funder => uint)) private donatedSum;
    Task[] private taskList;
    Reviewer[] private reviewerList;
    Freelancer[] private freelancerList;

    constructor(uint _tokensPerFunder, uint _tokenSupply) {
        require(
            _tokensPerFunder < _tokenSupply,
            "Total supply must be greater than the tokens allocated per funder"
        );

        token = new FIIToken(_tokensPerFunder, _tokenSupply, address(this));
    }

    function addAccount(address _accountAddr) public {
        Account tempAccount = Account(_accountAddr);
        require(
            tempAccount.getMarketplace() == this,
            "The account belongs to a different marketplace"
        );
        require(
            owners[tempAccount.owner()] == address(0),
            "This address already owns an account on this marketplace"
        );

        uint accountType = tempAccount.getAccountType();

        if (accountType == 1) {
            // funder, for manager there is nothing to be done
            // send the inital tokens to the funder
            token.approve(address(this), token.getTokensPerFunder());
            token.transferFrom(
                address(this),
                _accountAddr,
                token.getTokensPerFunder()
            );
        } else if (accountType == 2) {
            // reviewer
            reviewerList.push(Reviewer(_accountAddr));
        } else if (accountType == 3) {
            freelancerList.push(Freelancer(_accountAddr));
        }

        // register owner - account into the marketplace
        owners[tempAccount.owner()] = _accountAddr;
    }

    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy some tokens");
        require(
            owners[msg.sender] != address(0),
            "This address doesn't own any account on this marketplace"
        );

        token.approve(address(this), msg.value);
        // Transfer token to the msg.sender
        token.transferFrom(address(this), owners[msg.sender], msg.value);
    }

    //----------------------------
    // actions performed by the manager through the marketplace
    // * initializeTask - create a new task and add it to the marketplace
    // * assignReviewer - associate a task that the manager owns to a reviewer
    // * assignFreelancer - associate a task that the manager owns to a freelancer
    // * evaluate - evaluate the solution provided by the freelancer and approve it or not
    //----------------------------

    function initializeTask(
        string memory description,
        string memory domain,
        uint totalFreelancerBounty,
        uint totalReviewerBounty
    ) public {
        require(
            owners[Account(msg.sender).owner()] != address(0),
            "This manager hasn't been added to the marketplace."
        );
        require(
            Account(msg.sender).getAccountType() == 0,
            "This address is not associated with a manager account."
        );

        Manager manager = Manager(msg.sender);
        require(
            manager.getMarketplace() == this,
            "The manager belongs to another marketplace"
        );

        Task newTask = new Task(
            this,
            description,
            domain,
            manager,
            totalFreelancerBounty,
            totalReviewerBounty
        );
        taskList.push(newTask);
    }

    function assignReviewer(Task task, Reviewer reviewer) public {
        require(
            task.getManager() == Manager(msg.sender),
            "The assignment should be made by the manager of the task"
        );
        require(
            keccak256(bytes(task.getDomain())) ==
                keccak256(bytes(reviewer.getDomain())),
            "The domains of the task and of the review do not match"
        );

        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        ); // works also as a check for Manager to be part of this marketplace

        uint reviewerIndex = getReviewerIndex(reviewer);
        require(
            reviewerIndex < reviewerList.length,
            "This reviewer cannot be found in the task list"
        );

        taskList[taskIndex].waitingFreelancer();
        reviewers[task] = reviewer;
    }

    function assignFreelancer(Task task, Freelancer freelancer) public {
        require(
            task.getManager() == Manager(msg.sender),
            "The assignment should be made by the manager of the task"
        );

        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        ); // works also as a check for Manager to be part of this marketplace

        uint bidderIndex = 0;
        for (
            bidderIndex = 0;
            bidderIndex < bidders[task].length;
            bidderIndex++
        ) {
            if (bidders[task][bidderIndex] == freelancer) break;
        }

        require(
            bidderIndex < bidders[task].length,
            "The freelancer didn't bid to this task"
        ); // works also as a check for freelancer to be part of this marketplace

        taskList[taskIndex].start();

        // return warranty to the other bidders
        uint warranty = task.getReviewerBounty();
        for (uint i = 0; i < bidders[task].length; i++) {
            if (i != bidderIndex) {
                token.approve(address(this), warranty);
                token.transferFrom(
                    address(this),
                    address(bidders[task][i]),
                    warranty
                );
            }
        }

        freelancers[task] = freelancer;
    }

    function cancelTask(Task task) public {
        require(
            task.getManager() == Manager(msg.sender),
            "Only the manager can cancel this task"
        );

        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        ); // works also as a check for freelancer to be part of this marketplace

        taskList[taskIndex].cancel();

        // retrieve the tokens to the funders
        for (uint i = 0; i < funders[task].length; i++) {
            token.approve(address(this), donatedSum[task][funders[task][i]]);
            token.transferFrom(
                address(this),
                address(funders[task][i]),
                donatedSum[task][funders[task][i]]
            );
        }
    }

    function evaluate(Task task, bool approve) public {
        require(
            task.getManager() == Manager(msg.sender),
            "Only the manager can approve the solution"
        );

        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        ); // works also as a check for freelancer to be part of this marketplace

        taskList[taskIndex].evaluateByManager(approve);

        if (approve) {
            // return the warranty to the freelancer and pay him with reviewer bounty + freelancer bounty
            token.approve(
                address(this),
                task.getTotalBounty() + task.getReviewerBounty()
            );
            token.transferFrom(
                address(this),
                address(freelancers[task]),
                task.getTotalBounty() + task.getReviewerBounty()
            );

            freelancers[task].incrementReputation();
        }
    }

    //----------------------------
    // actions performed by the funder through the marketplace
    // * provideFunding - adding funds to a specific task from the marketplace
    // * retrieveFunding - withdraw funds from a specific task from the marketplace
    //----------------------------

    function provideFunding(Task task, uint nTokens) public {
        require(
            owners[Account(msg.sender).owner()] != address(0),
            "This funder hasn't been added to the marketplace."
        );
        require(
            Account(msg.sender).getAccountType() == 1,
            "This address is not associated with a funder account."
        );

        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        );

        require(
            task.getTaskState() == 0,
            "The task should be in pending state to receive funding."
        );
        require(donatedSum[task][Funder(msg.sender)] == 0);

        if (nTokens + task.getCurrentBounty() > task.getTotalBounty()) {
            nTokens = task.getTotalBounty() - task.getCurrentBounty();
        }

        token.transferFrom(msg.sender, address(this), nTokens);
        donatedSum[task][Funder(msg.sender)] = nTokens;
        funders[task].push(Funder(msg.sender));

        taskList[taskIndex].incrementBounty(int256(nTokens));
    }

    function retrieveFunding(Task task, uint nTokens) public {
        require(
            task.getTaskState() <= 1,
            "The task was already made public for freelancers"
        );
        require(
            donatedSum[task][Funder(msg.sender)] >= nTokens,
            "The requested amount of tokens exceeds the funded sum"
        ); // this works also as a verification for the funder

        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        );

        taskList[taskIndex].incrementBounty(-int256(nTokens));

        token.approve(address(this), nTokens);
        token.transferFrom(address(this), msg.sender, nTokens);

        donatedSum[task][Funder(msg.sender)] -= nTokens;

        if (donatedSum[task][Funder(msg.sender)] == 0) {
            // removed the funder from the list of active funders
            for (uint i = 0; i < funders[task].length; i++) {
                if (funders[task][i] == Funder(msg.sender)) {
                    delete funders[task][i];
                    break;
                }
            }
        }
    }

    //----------------------------
    // actions performed by the reviewer through the marketplace
    // * review - evaluate the solution and approve it or not
    //----------------------------

    function review(Task task, bool approve) public {
        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        );

        require(
            reviewers[task] == Reviewer(msg.sender),
            "Only the reviwer can evaluate the solution"
        );

        taskList[taskIndex].evaluateByReviewer(approve);
        token.approve(
            address(this),
            task.getTotalBounty() + task.getReviewerBounty()
        );

        if (approve) {
            // return the warranty to the freelancer and pay him with freelancer bounty
            // also pay the reviewer with reviewer bounty
            token.transferFrom(
                address(this),
                address(freelancers[task]),
                task.getTotalBounty()
            );
            token.transferFrom(
                address(this),
                address(reviewers[task]),
                task.getReviewerBounty()
            );
            // update freelancer reputation
            freelancers[task].incrementReputation();
        } else {
            // pay the reviewer with freelancer's warranty
            // retrieve the tokens to the funders
            for (uint i = 0; i < funders[task].length; i++)
                token.transferFrom(
                    address(this),
                    address(funders[task][i]),
                    donatedSum[task][funders[task][i]]
                );
            // update freelancer reputation
            freelancers[task].decrementReputation();
        }
    }

    //----------------------------
    // actions performed by the freelancer through the marketplace
    // * bid - bid to a task with the same domain
    // * assignReviewer - associate a task that the manager owns to a reviewer
    // * assignFreelancer - associate a task that the manager owns to a freelancer
    //----------------------------

    function bid(Task task) public {
        require(
            keccak256(bytes(task.getDomain())) ==
                keccak256(bytes(Freelancer(msg.sender).getDomain())),
            "The domains of the task and of the freelancer do not match"
        );
        uint freelancerIndex = getFreelancerIndex(Freelancer(msg.sender));
        require(
            freelancerIndex < freelancerList.length,
            "This freelancer hasn't been added to the marketplace."
        );
        uint taskIndex = getTaskIndex(task);
        require(
            taskIndex < taskList.length,
            "This task cannot be found in the task list"
        );
        require(
            task.getTaskState() == 2,
            "The task is not looking for freelancers at the moment"
        );

        bool alreadyBid = false;
        for (uint i = 0; i < bidders[task].length; i++) {
            if (Freelancer(msg.sender) == bidders[task][i]) {
                alreadyBid = true;
                break;
            }
        }
        require(!alreadyBid, "This freelancer has already bid to this task");

        token.transferFrom(msg.sender, address(this), task.getReviewerBounty()); // attempt to pay the warranty from the freelancer contract
        bidders[task].push(Freelancer(msg.sender));
    }

    function notifyManager(Task task, string memory solution) public {
        require(
            freelancers[task] == Freelancer(msg.sender),
            "The task was not assigned to this freelancer"
        );

        task.setSolution(solution);
    }

    //----------------------------
    // getters
    //----------------------------

    function getDonatedSum(Task task) public view returns (uint) {
        return donatedSum[task][Funder(msg.sender)];
    }

    function getToken() public view returns (FIIToken) {
        return token;
    }

    function getTask(uint index) public view returns (Task) {
        require(
            index < taskList.length,
            "The index should be lower than the task list length"
        );

        return taskList[index];
    }

    function getReviewer(uint index) public view returns (Reviewer) {
        require(
            index < reviewerList.length,
            "The index should be lower than the reviewer list length"
        );

        return reviewerList[index];
    }

    function getFreelancer(uint index) public view returns (Freelancer) {
        require(
            index < freelancerList.length,
            "The index should be lower than the freelancer list length"
        );

        return freelancerList[index];
    }

    function getBidder(Task task, uint index)
        public
        view
        returns (Freelancer)
    {
        require(
            index < bidders[task].length,
            "The index should be lower than the bidders list length"
        );

        return bidders[task][index];
    }

    function getTaskIndex(Task task) public view returns (uint) {
        uint i;
        for (i = 0; i < taskList.length; i++) {
            if (taskList[i] == task) {
                break;
            }
        }

        return i;
    }

    function getReviewerIndex(Reviewer reviewer) public view returns (uint) {
        uint i;
        for (i = 0; i < reviewerList.length; i++) {
            if (reviewerList[i] == reviewer) {
                break;
            }
        }

        return i;
    }

    function getFreelancerIndex(Freelancer freelancer)
        public
        view
        returns (uint)
    {
        uint i;
        for (i = 0; i < freelancerList.length; i++) {
            if (freelancerList[i] == freelancer) {
                break;
            }
        }

        return i;
    }

    function getNTasks() public view returns (uint) {
        return taskList.length;
    }

    function getNReviewers() public view returns (uint) {
        return reviewerList.length;
    }

    function getNFreelancers() public view returns (uint) {
        return freelancerList.length;
    }

    function getAccountType(address ownerAddr) public view returns (uint) {
        return Account(owners[ownerAddr]).getAccountType();
    }

    function getOwnersAccount(address ownerAddr) public view returns (address) {
        return owners[ownerAddr];
    }

    function getBalance(address accountAddr) public view returns (uint) {
        return token.balanceOf(accountAddr);
    }

    function getTaskReviewer(Task task) public view returns (Reviewer) {
        return reviewers[task];
    }

    function getTaskFreelancer(Task task) public view returns (Freelancer) {
        return freelancers[task];
    }

    function getNBidders(Task task) public view returns (uint) {
        return bidders[task].length;
    }
}
