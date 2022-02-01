var contractAddress, mkAddr, marketplaceContract, funderContract, accountAddr, balance;
var availableTasks = [];

window.ethereum.on('accountsChanged', function (accounts) {
  location.reload()
})

window.onload = async function init() {
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  contractAddress = accounts[0];
  console.log(accounts);

  mkAddr = await localStorage.getItem("marketplaceAddress");

  marketplaceContract = new web3.eth.Contract(marketplaceABI, mkAddr);

  // go back to signup page if the marketplace wasn't started
  // or is the first time the owner accesses the marketplace
  if (contractAddress == null || mkAddr == null) {
    window.location.href = "index.html";
    return;
  }

  accountAddr = await marketplaceContract.methods.getOwnersAccount(contractAddress)
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  // the owner hasn't yet been added to the marketplace
  if (accountAddr == zeroAddr) {
    window.location.href = "index.html";
    return;
  }

  let actualAccountType = await marketplaceContract.methods.getAccountType(contractAddress)
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  actualAccountType = roles[actualAccountType];

  // the owner's account doesn't have access to this page
  if (actualAccountType != "funder") {
    window.location.href = actualAccountType + ".html";
    return;
  }

  balance = await marketplaceContract.methods.getBalance(accountAddr)
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  // get instance of the manager contract
  funderContract = new web3.eth.Contract(funderABI, accountAddr);

  // update fields
  document.getElementById("owner_addr").innerHTML = contractAddress;
  document.getElementById("manager_addr").innerHTML = accountAddr;

  let funderName = await funderContract.methods.getName()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("manager_name").innerHTML = funderName;
  document.getElementById("mk_addr").innerHTML = mkAddr;
  document.getElementById("token_balance").innerHTML = balance;

  getFundableTasks().then(displayTasks);
}

async function getFundableTasks() {
  let nTasks = await marketplaceContract.methods.getNTasks()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  for (let i = 0; i < nTasks; i++) {
    let taskAddr = await marketplaceContract.methods.getTask(i)
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    let taskContract = new web3.eth.Contract(taskABI, taskAddr);

    let taskState = await taskContract.methods.getTaskState()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    // task hasn't received a reviewer yet
    if (taskState <= 1) {
      let domain = await taskContract.methods.getDomain()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      let description = await taskContract.methods.getDescription()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      let revBounty = await taskContract.methods.getReviewerBounty()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      let frBounty = await taskContract.methods.getFreelancerBounty()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      let currentBounty = await taskContract.methods.getCurrentBounty()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      let donatedSum = await funderContract.methods.getDonatedSum(taskAddr)
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      availableTasks.push({
        domain: domain,
        description: description,
        freelancerBounty: frBounty,
        reviewerBounty: revBounty,
        taskState: taskState,
        currentBounty: currentBounty,
        taskAddress: taskAddr,
        index: i,
        donatedSum: donatedSum
      });
    }
  }
}

async function displayTasks() {
  let mainCont = document.getElementById("main-container");
  for (let i = 0; i < availableTasks.length; i++) {
    let wellDiv = document.createElement("div");
    wellDiv.id = "task_" + (i + 1);
    wellDiv.classList.add("well");
    wellDiv.classList.add("well-small");

    let taskTitle = document.createElement("legend");
    taskTitle.className = "lead";
    taskTitle.textContent = "Task #" + availableTasks[i]["index"];
    wellDiv.appendChild(taskTitle);

    // task address
    let fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Task address:</strong>";
    wellDiv.appendChild(fieldText);
    let spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_addr";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + availableTasks[i]["taskAddress"];
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // domain
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Domain:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_domain";
    spanElem.innerHTML = "    " + availableTasks[i]["domain"];
    spanElem.className = "col";
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // funding progress
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Funding progress:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_funding_progr";
    spanElem.innerHTML = "    " + availableTasks[i]["currentBounty"] + " / " + (parseInt(availableTasks[i]["reviewerBounty"]) + parseInt(availableTasks[i]["freelancerBounty"]));
    spanElem.className = "col";
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // my donation
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>My donation:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_donation";
    spanElem.innerHTML = "    " + availableTasks[i]["donatedSum"];
    spanElem.className = "col";
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // description
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Description:</strong>";
    wellDiv.appendChild(fieldText);
    let textareaElem = document.createElement("textarea");
    textareaElem.className = "form-control";
    textareaElem.readOnly = true;
    textareaElem.id = "task_" + (i + 1) + "_descr";
    textareaElem.innerHTML = "    " + availableTasks[i]["description"];
    wellDiv.appendChild(textareaElem);


    // add or retrieve funding
    let sumInput = document.createElement("input");
    sumInput.className = "col-sm-10";
    sumInput.type = "number";
    sumInput.min = 1;
    sumInput.value = 10;
    sumInput.id = "task_" + (i + 1) + "_fund_sum";
    wellDiv.appendChild(sumInput);
    wellDiv.appendChild(document.createElement("br"));
    wellDiv.appendChild(document.createElement("br"));

    let btnDiv = document.createElement("div");
    btnDiv.className = "btn-toolbar";
    btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-danger");
    btn.id = "task_" + (i + 1) + "_reject";
    btn.onclick = async function () { retrieveFunding(i); }
    btn.innerText = "Retrieve funding!";
    btn.disabled = parseInt(availableTasks[i]["donatedSum"]) == 0;
    btnDiv.appendChild(btn);
    btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-success");
    btn.id = "task_" + (i + 1) + "_approve";
    btn.onclick = async function () { fund(i); }
    btn.innerText = "Fund!";
    btn.disabled = parseInt(availableTasks[i]["donatedSum"]) > 0;

    btnDiv.appendChild(btn);
    wellDiv.appendChild(btnDiv);

    mainCont.appendChild(wellDiv);
  }
}

async function fund(index) {
  let amount = parseInt(document.getElementById("task_" + (index + 1) + "_fund_sum").value);
  if (amount > balance) {
    alert("The amount you introduced exceeds your balance!");
    return;
  }

  if (isNaN(amount) || amount < 1) {
    alert("The amount field should not be empty or lower than 1!");
    return;
  }

  await funderContract.methods.provideFunding(availableTasks[index]["taskAddress"], amount)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task funded. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the number of funded tokens exceeds your balance");
      }
    });

  location.reload()
}

async function retrieveFunding(index) {
  let amount = parseInt(document.getElementById("task_" + (index + 1) + "_fund_sum").value);
  let donated = parseInt(document.getElementById("task_" + (index + 1) + "_donation").innerHTML);

  if (isNaN(amount) || amount < 1) {
    alert("The amount field should not be empty or lower than 1!");
    return;
  }

  if (amount > donated) {
    alert("You can't withdraw more than you funded!");
    return;
  }

  await funderContract.methods.retrieveFunding(availableTasks[index]["taskAddress"], amount)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task funded. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the number of requested tokens exceeds your donation");
      }
    });

  location.reload()
}

async function buyTokens() {
  let amount = parseInt(document.getElementById("funder_buy_tokens").value);

  if (isNaN(amount)) {
    alert("The amount field should not be empty!");
    return;
  }

  await marketplaceContract.methods.buyTokens()
    .send({ from: contractAddress, value: amount })
    .then(function (result) {
      console.log("Bought tokens. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("Insufficient funds");
      }
    });

  location.reload();
}