var mkAddr, contractAddress, marketplaceContract;

window.ethereum.on('accountsChanged', function (accounts) {
    location.reload()
})

window.onload = async function init() {

    // RPC methods https://eips.ethereum.org/EIPS/eip-1474
    // https://docs.metamask.io/guide/getting-started.html#connecting-to-metamask
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    contractAddress = accounts[0];
    console.log(accounts);

    sessionStorage.setItem("ownerAddr", contractAddress);
    mkAddr = await localStorage.getItem("marketplaceAddress");


    if (mkAddr == null) {
        let deployContract = new web3.eth.Contract(marketplaceABI);

        let payload = {
            data: marketplaceBytecode,
            arguments: [20, 10000]
        }

        let parameter = {
            from: contractAddress
            //gas: web3.utils.toHex(5000000)
            // gasPrice: web3.utils.toHex(web3.utils.toWei('30', 'gwei'))
        }

        mkAddr = await deployContract.deploy(payload)
            .send(parameter, (err, transactionHash) => {
                console.log('Transaction Hash :', transactionHash);
            })
            .on('confirmation', () => { })
            .then((newContractInstance) => {
                console.log('Deployed Contract Address : ', newContractInstance.options.address);
                return newContractInstance.options.address;
            });


        await localStorage.setItem("marketplaceAddress", mkAddr);
    }

    marketplaceContract = new web3.eth.Contract(marketplaceABI, mkAddr);

    let accountAddr = await marketplaceContract.methods.getOwnersAccount(contractAddress)
        .call({ from: contractAddress })
        .then(function (result) {
            return result;
        });

    if (accountAddr != zeroAddr) {
        let actualAccountType = await marketplaceContract.methods.getAccountType(contractAddress)
            .call({ from: contractAddress })
            .then(function (result) {
                return result;
            });

        actualAccountType = roles[actualAccountType];
        console.log(actualAccountType);

        window.location.href = actualAccountType + ".html";
    }



    document.getElementById("account_addr").innerHTML = contractAddress;
    document.getElementById("mk_addr").innerHTML = mkAddr;
}


async function signUp() {
    let domainChoice = document.getElementById("domain_signup").value;
    let accountTypeChoice = document.getElementById("accounts_types_signup").value;
    let name = document.getElementById("name_signup").value;

    var currentABI, currentBytecode, arguments;
    switch (accountTypeChoice) {
        case "manager":
            currentABI = managerABI;
            currentBytecode = managerBytecode;
            arguments = [mkAddr, name];
            break;
        case "funder":
            currentABI = funderABI;
            currentBytecode = funderBytecode;
            arguments = [mkAddr, name];
            break;
        case "reviewer":
            currentABI = reviewerABI;
            currentBytecode = reviewerBytecode;
            arguments = [mkAddr, name, domainChoice];
            break;
        case "freelancer":
            currentABI = freelancerABI;
            currentBytecode = freelancerBytecode;
            arguments = [mkAddr, name, domainChoice];
            break;
    }

    let deployContract = new web3.eth.Contract(currentABI);

    let payload = {
        data: currentBytecode,
        arguments: arguments
    }

    let parameter = {
        from: contractAddress,
        // gas: web3.utils.toHex(5000000)
        // gasPrice: web3.utils.toHex(web3.utils.toWei('30', 'gwei'))
    }

    let accountAddr = await deployContract.deploy(payload)
        .send(parameter, (err, transactionHash) => {
            console.log('Transaction Hash :', transactionHash);
        })
        .on('confirmation', () => { })
        .then((newContractInstance) => {
            return newContractInstance.options.address;
        })
        .catch(function (error) {
            if (error) {
                console.log("Adding account error: " + error);
            }
        });

    console.log(accountAddr);

    var actualAccountType = await marketplaceContract.methods.addAccount(accountAddr)
        .send({ from: contractAddress })
        .then(function (result) {
            return accountTypeChoice;
        })
        .catch(function (error) {
            if (error) {
                console.log("error is " + error);
            }
            return "";
        });

    if (actualAccountType == "") {
        actualAccountType = await marketplaceContract.methods.getAccountType(contractAddress)
            .call({ from: contractAddress })
            .then(function (result) {
                return result;
            });

        actualAccountType = roles[actualAccountType];
    }

    console.log(actualAccountType)

    window.location.href = actualAccountType + ".html";;
}