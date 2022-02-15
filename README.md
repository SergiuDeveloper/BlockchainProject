# Freelance Marketplace dApp


This project simulates a freelance marketplace that is developed on an Ethereum network. The transactions are made using an ERC20 token (in our case, 1 token = 1 wei).

To understand the marketplace workflow, we define the following terms:

* **task**: a freelance project that is posted on the marketplace. A task contains the job description, a category and the bounty designated to the reviewer (RB) and to the freelancer (FB).
* **manager**: the manager creates the task. He can furtherly assign the task to a reviewer or to a freelancer and can accept or reject the solution provided by the freelancer.
* **funder**: each task must be funded before it could be posted on the marketplace. The funder can contribute to reaching the funding goal of a task.
* **reviewer**: the reviewer intervenes only if the manager rejects the freelancer's solution and decides whether the rejection was fair or not.
* **freelancer**: the freelancer can bid and solve the tasks posted on the marketplace.

## Implementation

The whole marketplace logic was developed using Solidity Contracts. For testing, we used the Kovan Ethereum test network.
The decentralized application interacts with the contracts using the MetaMask plugin.

## The app flow

The manager creates tasks and uploads them to the marketplace. Each task should have its funding goal (RB + FB) reached. After reaching the goal, the manager assigns the task to a reviewer from the same category. Once the reviewer it's assigned, the freelancers can bid on the task only if they have the same category. To participate in the bidding, the freelancer must pay a fee equal to RB.

The manager can then choose one of the bidders. The bidders that did not get the job get their fee back. The selected freelancer must provide a solution to the task. If the solution is accepted, the freelancer receives FB + 2*RB tokens. If the solution is rejected, the reviewer has to evaluate the solution. If the reviewer accepts the solution, the freelancer receives FB + RB tokens. If not, the tokens allocated to the task (FB + RB) are returned back to the funders. In both cases, the reviewer receives RB tokens.

The marketplace also provides a reputation mechanism for freelancers. Each freelancer starts with a reputation of 5, which is incremented (up to 10) if one of its solutions is accepted or decremented (down to 1) if it is rejected.

## Things that can be improved

* writing the task not as stand-alone contracts, but as structures that are part of the marketplace.
