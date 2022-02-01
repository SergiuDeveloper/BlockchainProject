var contractAddress, mkAddr, marketplaceContract, balance, domain, accountAddr, freelancerContract;
var biddableTasks = [];
var myTasks = [];

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
  if (actualAccountType != "freelancer") {
    window.location.href = actualAccountType + ".html";
  }

  // get instance of the manager contract
  freelancerContract = new web3.eth.Contract(freelancerABI, accountAddr);

  // update fields
  document.getElementById("owner_addr").innerHTML = contractAddress;
  document.getElementById("freelancer_addr").innerHTML = accountAddr;

  let freelancerName = await freelancerContract.methods.getName()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("freelancer_name").innerHTML = freelancerName;
  document.getElementById("mk_addr").innerHTML = mkAddr;

  let reputation = await freelancerContract.methods.getReputation()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("reputation").innerHTML = reputation;

  balance = await marketplaceContract.methods.getBalance(accountAddr)
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("token_balance").innerHTML = balance;

  domain = await freelancerContract.methods.getDomain()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("domain").innerHTML = domain;

  getFundableTasks().then(() => {
    console.log(biddableTasks);
    console.log(myTasks);
    displayMyTasks().then(() => {
      console.log("Displayhing biddable");
      displayBiddableTasks().then(() => { console.log("gata"); })
    })
  });
}



async function displayMyTasks() {
  let mainCont = document.getElementById("my_tasks");
  for (let i = 0; i < myTasks.length; i++) {
    let wellDiv = document.createElement("div");
    wellDiv.id = "task_" + (i + 1);
    wellDiv.classList.add("well");
    wellDiv.classList.add("well-small");

    // task title
    let taskTitle = document.createElement("legend");
    taskTitle.className = "lead";
    taskTitle.textContent = "Task #" + myTasks[i]["index"];
    wellDiv.appendChild(taskTitle);

    // task address
    let fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Task address:</strong>";
    wellDiv.appendChild(fieldText);
    let spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_addr";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + myTasks[i]["taskAddress"];
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // freelancer bounty
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Freelancer bounty:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_fr_bounty";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + myTasks[i]["freelancerBounty"];
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // reviewer bounty
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Reviewer bounty:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_rev_bounty";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + myTasks[i]["reviewerBounty"];
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
    textareaElem.innerHTML = "    " + myTasks[i]["description"];
    wellDiv.appendChild(textareaElem);

    // solution
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Solution:</strong>";
    wellDiv.appendChild(fieldText);
    textareaElem = document.createElement("textarea");
    textareaElem.className = "form-control";
    textareaElem.id = "task_" + (i + 1) + "_solution";
    textareaElem.placeholder = "insert solution here";
    wellDiv.appendChild(textareaElem);
    wellDiv.appendChild(document.createElement("br"));

    // send solution
    let btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-success");
    btn.id = "task_" + (i + 1) + "_submit_solution";
    btn.onclick = async function () { submitSolution(i); }
    btn.innerText = "Submit solution";
    wellDiv.appendChild(btn);

    mainCont.appendChild(wellDiv);
  }
}


async function submitSolution(index) {
  let solution = document.getElementById("task_" + (index + 1) + "_solution").value;

  if (solution == "") {
    alert("You can't submit empty solutions!");
    return;
  }

  await freelancerContract.methods.notifyManager(myTasks[index]["taskAddress"], solution)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Solution sent. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
      }
    });

  location.reload()
}


async function displayBiddableTasks() {

  let mainCont = document.getElementById("browse_tasks");
  for (let i = 0; i < biddableTasks.length; i++) {
    let wellDiv = document.createElement("div");
    wellDiv.id = "task_" + (i + 1);
    wellDiv.classList.add("well");
    wellDiv.classList.add("well-small");

    // task title
    let taskTitle = document.createElement("legend");
    taskTitle.className = "lead";
    taskTitle.textContent = "Task #" + biddableTasks[i]["index"];
    wellDiv.appendChild(taskTitle);

    // task address
    let fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Task address:</strong>";
    wellDiv.appendChild(fieldText);
    let spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_addr";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + biddableTasks[i]["taskAddress"];
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // freelancer bounty
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Freelancer bounty:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_fr_bounty";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + biddableTasks[i]["freelancerBounty"];
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // reviewer bounty
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Reviewer bounty:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_rev_bounty";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + biddableTasks[i]["reviewerBounty"];
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
    textareaElem.innerHTML = "    " + biddableTasks[i]["description"];
    wellDiv.appendChild(textareaElem);

    // add or retrieve funding
    // let sumInput = document.createElement("input");
    // sumInput.className="col-sm-10";
    // sumInput.type = "number";
    // sumInput.min = 1;
    // sumInput.value = 10;
    // sumInput.id = "task_" + (i + 1) + "_fund_sum";
    // wellDiv.appendChild(sumInput);
    // wellDiv.appendChild(document.createElement("br"));
    // wellDiv.appendChild(document.createElement("br"));

    let btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-success");
    btn.id = "task_" + (i + 1) + "_bid";
    btn.onclick = async function () { bidTask(i); }
    btn.innerText = "Bid!";
    btn.disabled = !biddableTasks[i]["canBid"];
    wellDiv.appendChild(btn);

    mainCont.appendChild(wellDiv);
  }
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

    let taskDomain = await taskContract.methods.getDomain()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    // the domains must match
    if (taskDomain != domain)
      continue

    let taskState = await taskContract.methods.getTaskState()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    var description, revBounty, frBounty;
    if (taskState == 2 || taskState == 3) {
      description = await taskContract.methods.getDescription()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      revBounty = await taskContract.methods.getReviewerBounty()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      frBounty = await taskContract.methods.getFreelancerBounty()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });
    }

    // task has started
    if (taskState == 3) {
      let taskFreelancerAddr = await marketplaceContract.methods.getTaskFreelancer(taskAddr)
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      // the task is assigned to this freelancer
      if (taskFreelancerAddr == accountAddr) {
        myTasks.push({
          taskAddress: taskAddr,
          description: description,
          freelancerBounty: frBounty,
          reviewerBounty: revBounty,
          index: i
        });
      }
    } else if (taskState == 2) { // can bid to this task
      let bidFlag = await hasBid(taskAddr);

      biddableTasks.push({
        taskAddress: taskAddr,
        description: description,
        freelancerBounty: frBounty,
        reviewerBounty: revBounty,
        index: i,
        canBid: !bidFlag
      });

    }
  }
}

async function hasBid(taskAddress) {
  let nBidders = await marketplaceContract.methods.getNBidders(taskAddress)
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  for (let i = 0; i < nBidders; i++) {
    let bidder = await marketplaceContract.methods.getBidder(taskAddress, i)
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    if (bidder == accountAddr)
      return true;
  }

  return false;
}


async function bidTask(index) {
  if (balance < biddableTasks[index]["reviewerBounty"]) {
    alert("You don't have sufficient tokens to bid!\nYou need " + biddableTasks[index]["reviewerBounty"] + " tokens!");
    return;
  }

  await freelancerContract.methods.bid(biddableTasks[index]["taskAddress"])
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Bid to task. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the task was updated and is no longer biddable");
      }
    });

  location.reload()
}



async function buyTokens() {
  let amount = parseInt(document.getElementById("freelancer_buy_tokens").value);

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