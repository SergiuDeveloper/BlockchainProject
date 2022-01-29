// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.0.0/contracts/token/ERC20/ERC20.sol";

contract FIIToken is ERC20 {
    uint private tokensPerFunder;
    uint private tokenSupply;
    address marketplaceAddress;

    constructor(uint _tokensPerFunder, uint _tokenSupply, address _marketplaceAddress) ERC20("FIIToken", "FII") {
        tokensPerFunder = _tokensPerFunder;
        tokenSupply = _tokenSupply;
        marketplaceAddress = _marketplaceAddress;

        _mint(_marketplaceAddress, tokenSupply);
    }

    function getTokensPerFunder() public view returns (uint) {
        return tokensPerFunder;
    }

    function getTokensSupply() public view returns (uint) {
        return tokenSupply;
    }

    function decimals() public view override virtual returns (uint8) {
        return 0;
    }
}