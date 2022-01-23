// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;


contract Reviewer {

    string private domain;

    constructor(string memory _domain) {
        domain = _domain;
    }

    function getDomain() public view returns (string memory) {
        return domain;
    }
}