// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Task.sol";


contract Funder {

    function provideFunding(Task task, uint tokens) public {
        require (task.getToken().balanceOf(address(this)) >= tokens);

        task.getToken().approve(address(task.getManager()), tokens);
        task.getManager().provideFunding(task);
    }

    function retrieveFunding(Task task) public {
        task.getManager().retrieveFunding(task);

        uint transferedTokens = task.getToken().allowance(address(task.getManager()), address(this));
        task.getToken().transferFrom(address(task.getManager()), address(this), transferedTokens);

        task.getManager().retrieveFunding(task);
    }
}