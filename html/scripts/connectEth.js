const ethEnabled = () => {
    // EIP-1193: Ethereum Provider JavaScript API  - https://eips.ethereum.org/EIPS/eip-1193
    if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        return true;
    }
    return false;
}

if (!ethEnabled()) {
    alert("Please install an Ethereum-compatible browser or extension like MetaMask to use this dApp!");
}