// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

import "./Freelancer.sol";
import "./Reviewer.sol";
import "./Manager.sol";
import "./Task.sol";
import "./Funder.sol";
import "./Token.sol";


contract Marketplace {
    event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);

    FIIToken token;
    mapping (address => address) owners;
    mapping (Task => Funder[]) funders;
    mapping (Task => Reviewer) reviewers;
    mapping (Task => Freelancer) freelancers;
    mapping (Task => Freelancer[]) bidders;
    mapping (Task => mapping(Funder => uint)) private donatedSum;
    //mapping (Task => uint) private totalSum;
    Task[] private taskList;
    Funder[] private funderList;
    Reviewer[] private reviewerList;
    // Manager[] private managerList;  ?
    Freelancer[] private freelancerList;

    constructor (uint _tokensPerFunder, uint _tokenSupply) {
        require(_tokensPerFunder < _tokenSupply, "Total supply must be greater than the tokens allocated per funder");
        
        token = new FIIToken(_tokensPerFunder, _tokenSupply, address(this));
        emit BuyTokens(address(token), 0, token.balanceOf(address(token)));

        emit BuyTokens(address(this), 0, token.balanceOf(address(this)));
    }

    function addFunder(Funder _funder) public {
        require(_funder.getMarketplace() == this, "The funder belongs to a different marketplace");
        require(owners[_funder.owner()] == address(0), "This address already owns an account on this marketplace");
        uint funderIndex = getFunderIndex(_funder);
        require(funderIndex == funderList.length, "This funder was already added.");
        funderList.push(_funder);

        token.approve(address(this), token.getTokensPerFunder());
        token.transferFrom(address(this), address(_funder), token.getTokensPerFunder());
        owners[_funder.owner()] = address(_funder);
    }

    function addReviewer(Reviewer _reviewer) public {
        require(_reviewer.getMarketplace() == this, "The reviewer belongs to a different marketplace");
        require(owners[_reviewer.owner()] == address(0), "This address already owns an account on this marketplace");
        uint reviewerIndex = getReviewerIndex(_reviewer);
        require(reviewerIndex == reviewerList.length, "This reviewer was already added.");
        reviewerList.push(_reviewer);
        owners[_reviewer.owner()] = address(_reviewer);
    }

    function addFreelancer(Freelancer _freelancer) public {
        require(_freelancer.getMarketplace() == this, "The freelancer belongs to a different marketplace");
        require(owners[_freelancer.owner()] == address(0), "This address already owns an account on this marketplace");
        uint freelancerIndex = getFreelancerIndex(_freelancer);
        require(freelancerIndex == freelancerList.length, "This freelancer was already added.");
        freelancerList.push(_freelancer);
        owners[_freelancer.owner()] = address(_freelancer);
    }

    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy some tokens");
        require(owners[msg.sender] != address(0), "This address doesn't own any account on this marketplace");

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

    function initializeTask(string memory description, string memory domain, uint totalFreelancerBounty, uint totalReviewerBounty) public {
        Manager manager = Manager(msg.sender);
        require(manager.getMarketplace() == this, "The manager belongs to another marketplace");

        Task newTask = new Task(this, description, domain, manager, totalFreelancerBounty, totalReviewerBounty);
        taskList.push(newTask);
        // totalSum[newTask] = 0;
    }
    
    function assignReviewer(Task task, Reviewer reviewer) public {
        require (task.getManager() == Manager(msg.sender), "The assignment should be made by the manager of the task");
        require (keccak256(bytes(task.getDomain())) == keccak256(bytes(reviewer.getDomain())), "The domains of the task and of the review do not match");

        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list"); // works also as a check for Manager to be part of this marketplace

        uint reviewerIndex = getReviewerIndex(reviewer);
        require(reviewerIndex < reviewerList.length, "This reviewer cannot be found in the task list");

        taskList[taskIndex].waitingFreelancer();
        reviewers[task] = reviewer;
    }

    function assignFreelancer(Task task, Freelancer freelancer) public {
        require (task.getManager() == Manager(msg.sender), "The assignment should be made by the manager of the task");

        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list"); // works also as a check for Manager to be part of this marketplace

        uint bidderIndex = 0;
        for(bidderIndex = 0; bidderIndex < bidders[task].length; bidderIndex++) {
            if(bidders[task][bidderIndex] == freelancer)
                break;
        }

        require(bidderIndex < bidders[task].length, "The freelancer didn't bid to this task"); // works also as a check for freelancer to be part of this marketplace

        taskList[taskIndex].start();

        // return warranty to the other bidders
        uint warranty = task.getReviewerBounty();
        for(uint i = 0; i < bidders[task].length; i++) {
            if (i != bidderIndex) {
                token.approve(address(this), warranty);
                token.transferFrom(address(this), address(bidders[task][i]), warranty);
            }
        }

        freelancers[task] = freelancer;
    }

    function cancelTask(Task task) public {
        require (task.getManager() == Manager(msg.sender), "Only the manager can cancel this task");

        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list");

        taskList[taskIndex].cancel();

        // retrieve the tokens to the funders
        for(uint i = 0; i < funders[task].length; i++) {
            token.approve(address(this), donatedSum[task][funders[task][i]]);
            token.transferFrom(address(this), address(funders[task][i]), donatedSum[task][funders[task][i]]);
        }
    }

    function evaluate(Task task, bool approve) public {
        require (task.getManager() == Manager(msg.sender), "Only the manager can approve the solution");

        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list");

        taskList[taskIndex].evaluateByManager(approve);

        if(approve) {
            // return the warranty to the freelancer and pay him with reviewer bounty + freelancer bounty
            token.approve(address(this), task.getTotalBounty() + task.getReviewerBounty());
            token.transferFrom(address(this), address(freelancers[task]), task.getTotalBounty() + task.getReviewerBounty());
        }
    }

    //----------------------------
    // actions performed by the reviewer through the marketplace
    // * review - evaluate the solution and approve it or not
    //----------------------------

    function review(Task task, bool approve) public {
        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list");

        require (reviewers[task] == Reviewer(msg.sender), "Only the reviwer can evaluate the solution");

        taskList[taskIndex].evaluateByReviewer(approve);
        token.approve(address(this), task.getTotalBounty() + task.getReviewerBounty());

        if(approve) {
            // return the warranty to the freelancer and pay him with freelancer bounty
            // also pay the reviewer with reviewer bounty
            token.transferFrom(address(this), address(freelancers[task]), task.getTotalBounty());
            token.transferFrom(address(this), address(reviewers[task]), task.getReviewerBounty());
        } else {
            // pay the reviewer with freelancer's warranty
            // retrieve the tokens to the funders
            for(uint i = 0; i < funders[task].length; i++)
                token.transferFrom(address(this), address(funders[task][i]), donatedSum[task][funders[task][i]]);
        }
    }   

    //----------------------------
    // actions performed by the freelancer through the marketplace
    // * bid - bid to a task with the same domain
    // * assignReviewer - associate a task that the manager owns to a reviewer
    // * assignFreelancer - associate a task that the manager owns to a freelancer
    //----------------------------

    function bid(Task task) public {
        require (keccak256(bytes(task.getDomain())) == keccak256(bytes(Freelancer(msg.sender).getDomain())), "The domains of the task and of the freelancer do not match");
        uint freelancerIndex = getFreelancerIndex(Freelancer(msg.sender));
        require(freelancerIndex < freelancerList.length, "This freelancer hasn't been added to the marketplace.");
        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list");
        require(task.getTaskState() == 2, "The task is not looking for freelancers at the moment");

        bool alreadyBid = false;
        for(uint i = 0; i < bidders[task].length; i++) {
            if(Freelancer(msg.sender) == bidders[task][i]) {
                alreadyBid = true;
                break;
            }
        }
        require(!alreadyBid, "This freelancer has already bid to this task");

        token.transferFrom(msg.sender, address(this), task.getReviewerBounty()); // attempt to pay the warranty from the freelancer contract
        bidders[task].push(Freelancer(msg.sender));
    }

    function notifyManager(Task task, string memory solution) public {
        require(freelancers[task] == Freelancer(msg.sender), "The task was not assigned to this freelancer");

        task.setSolution(solution);
    }

    //----------------------------
    // actions performed by the funder through the marketplace
    // * provideFunding - adding funds to a specific task from the marketplace
    // * retrieveFunding - withdraw funds from a specific task from the marketplace
    //----------------------------

    function provideFunding(Task task, uint nTokens) public {
        uint funderIndex = getFunderIndex(Funder(msg.sender));
        require(funderIndex < funderList.length, "This funder hasn't been added to the marketplace.");
        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list");

        require (task.getTaskState() == 0, "The task should be in pending state to receive funding.");
        require (donatedSum[task][Funder(msg.sender)] == 0);

        if(nTokens + task.getCurrentBounty() > task.getTotalBounty()) {
            nTokens = task.getTotalBounty() - task.getCurrentBounty();
        }

        token.transferFrom(msg.sender, address(this), nTokens);
        donatedSum[task][Funder(msg.sender)] = nTokens;
        funders[task].push(Funder(msg.sender));

        //totalSum[task] += nTokens;
        taskList[taskIndex].incrementBounty(int(nTokens));
    }

    function retrieveFunding(Task task, uint nTokens) public {
        require (task.getTaskState() <= 1, "The task was already made public for freelancers");
        require (donatedSum[task][Funder(msg.sender)] >= nTokens, "The requested amount of tokens exceeds the funded sum"); // this works also as a verification for the funder

        uint taskIndex = getTaskIndex(task);
        require(taskIndex < taskList.length, "This task cannot be found in the task list");

        taskList[taskIndex].incrementBounty(-int(nTokens));

        token.approve(address(this), nTokens);
        token.transferFrom(address(this), msg.sender, nTokens);

        donatedSum[task][Funder(msg.sender)] -= nTokens;
        //totalSum[task] -= nTokens ;
        
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
    // getters
    //----------------------------


    function getDonatedSum(Task task) public view returns (uint) {
        return donatedSum[task][Funder(msg.sender)];
    }

    function getToken() public view returns (FIIToken) {
        return token;
    }

    function getTask(uint index) public view returns (Task) {
        require(index < taskList.length, "The index should be lower than the task list length");

        return taskList[index];
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

    function getFunderIndex(Funder funder) public view returns (uint) {
        uint i;
        for (i = 0; i < funderList.length; i++) {
            if (funderList[i] == funder) {
                break;
            }
        }

        return i;
    }

    function getFreelancerIndex(Freelancer freelancer) public view returns (uint) {
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

    function getNFunders() public view returns (uint) {
        return funderList.length;
    }

    function getNReviewers() public view returns (uint) {
        return reviewerList.length;
    }

    // function getNManagers() public view returns (uint) {
    //     return managerList.length;
    // }

    function getNFreelancers() public view returns (uint) {
        return freelancerList.length;
    }

    
}