// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

import "./Funder.sol";


contract FIIToken is ERC20 {

    constructor(uint tokens, Funder[] memory funders) ERC20("FIIToken", "FII") {
        uint tokensCount = tokens * (10 ** uint256(decimals()));
        uint tokensPerFunder = tokensCount / funders.length;

        for (uint i = 0; i < funders.length; i++) {
            _mint(address(funders[i]), tokensPerFunder);
        }
    }
}