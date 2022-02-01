var contractAddress, mkAddr, marketplaceContract, managerContract, accountAddr;
var managerTasks = [];
var reviewers = [];

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
  if (actualAccountType != "manager") {
    window.location.href = actualAccountType + ".html";
  }

  // get instance of the manager contract
  managerContract = new web3.eth.Contract(managerABI, accountAddr);

  // update fields
  document.getElementById("owner_addr").innerHTML = contractAddress;
  document.getElementById("manager_addr").innerHTML = accountAddr;

  let managerName = await managerContract.methods.getName()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("manager_name").innerHTML = managerName;
  document.getElementById("mk_addr").innerHTML = mkAddr;

  getManagersTask().then(
    () => {
      getReviewers().then(
        () => {
          console.log(reviewers);
          console.log(managerTasks);
          displayTasks();
        }
      )
    }
  );
}

async function getReviewers() {
  let nReviewers = await marketplaceContract.methods.getNReviewers()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  for (let i = 0; i < nReviewers; i++) {
    let reviewerAddr = await marketplaceContract.methods.getReviewer(i)
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    let reviewerContract = new web3.eth.Contract(reviewerABI, reviewerAddr);

    let domain = await reviewerContract.methods.getDomain()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    let name = await reviewerContract.methods.getName()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    reviewers.push({
      domain: domain,
      name: name,
      reviewerAddress: reviewerAddr
    })
  }
}

async function getBidders(taskAddress) {
  let bidders = [];
  let nBidders = await marketplaceContract.methods.getNBidders(taskAddress)
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  for (let i = 0; i < nBidders; i++) {
    let bidderAddr = await marketplaceContract.methods.getBidder(taskAddress, i)
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    let bidderContract = new web3.eth.Contract(freelancerABI, bidderAddr);

    let bidderRep = await bidderContract.methods.getReputation()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    let bidderName = await bidderContract.methods.getName()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    bidders.push({
      name: bidderName,
      bidderAddress: bidderAddr,
      reputation: bidderRep
    })
  }

  return bidders;
}

async function getManagersTask() {
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
    let taskManager = await taskContract.methods.getManager()
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    // task belongs to the manager
    if (taskManager == accountAddr) {
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

      let taskState = await taskContract.methods.getTaskState()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      let solution = await taskContract.methods.getSolution()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      let taskBidders = await getBidders(taskAddr);

      managerTasks.push({
        domain: domain,
        description: description,
        freelancerBounty: frBounty,
        reviewerBounty: revBounty,
        taskState: taskState,
        solution: solution,
        currentBounty: currentBounty,
        taskAddress: taskAddr,
        index: i,
        bidders: taskBidders
      });
    }
  }
}

async function displayTasks() {
  let mainCont = document.getElementById("main-container");
  for (let i = 0; i < managerTasks.length; i++) {
    let wellDiv = document.createElement("div");
    wellDiv.id = "task_" + (i + 1);
    wellDiv.classList.add("well");
    wellDiv.classList.add("well-small");

    let taskTitle = document.createElement("legend");
    taskTitle.className = "lead";
    taskTitle.textContent = "Task #" + managerTasks[i]["index"];
    wellDiv.appendChild(taskTitle);

    // task address
    let fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Task address:</strong>";
    wellDiv.appendChild(fieldText);
    let spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_addr";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + managerTasks[i]["taskAddress"];
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // task state
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>State:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_state";
    spanElem.innerHTML = "    " + taskStates[managerTasks[i]["taskState"]][0];
    spanElem.classList.add("col");
    spanElem.classList.add(taskStates[managerTasks[i]["taskState"]][1]);
    wellDiv.appendChild(spanElem);
    wellDiv.appendChild(document.createElement("br"));

    // domain
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Domain:</strong>";
    wellDiv.appendChild(fieldText);
    spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_domain";
    spanElem.innerHTML = "    " + managerTasks[i]["domain"];
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
    spanElem.innerHTML = "    " + managerTasks[i]["currentBounty"] + " / " + (parseInt(managerTasks[i]["reviewerBounty"]) + parseInt(managerTasks[i]["freelancerBounty"]));
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
    textareaElem.innerHTML = "    " + managerTasks[i]["description"];
    wellDiv.appendChild(textareaElem);

    // solution
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Solution:</strong>";
    fieldText.style.display = (managerTasks[i]["taskState"] < 4 || managerTasks[i]["taskState"] == 7) ? "none" : "block";
    wellDiv.appendChild(fieldText);
    textareaElem = document.createElement("textarea");
    textareaElem.className = "form-control";
    textareaElem.readOnly = true;
    textareaElem.id = "task_" + (i + 1) + "_solution";
    textareaElem.innerHTML = "    " + managerTasks[i]["solution"];
    textareaElem.style.display = (managerTasks[i]["taskState"] < 4 || managerTasks[i]["taskState"] == 7) ? "none" : "block";
    wellDiv.appendChild(textareaElem);

    // cancel task button
    let btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-danger");
    btn.id = "task_" + (i + 1) + "_cancel";
    btn.onclick = async function () { cancelTask(i); }
    btn.innerText = "Cancel task!";
    btn.style.display = (managerTasks[i]["taskState"] >= 2) ? "none" : "block";
    wellDiv.appendChild(btn);

    // accept - reject solution
    let btnDiv = document.createElement("div");
    btnDiv.className = "btn-toolbar";
    btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-danger");
    btn.id = "task_" + (i + 1) + "_reject";
    btn.onclick = async function () { rejectTask(i); }
    btn.innerText = "Reject solution!";
    btnDiv.appendChild(btn);
    btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-success");
    btn.id = "task_" + (i + 1) + "_approve";
    btn.onclick = async function () { approveTask(i); }
    btn.innerText = "Approve solution!";
    btnDiv.appendChild(btn);
    btnDiv.style.display = (managerTasks[i]["taskState"] != 4) ? "none" : "block";
    wellDiv.appendChild(btnDiv);

    // choose reviewer
    let selectEl = document.createElement("select");
    selectEl.className = "col-sm-10";
    selectEl.id = "task_" + (i + 1) + "_select_reviewer";

    let atLeastOne = false;

    for (let j = 0; j < reviewers.length; j++) {
      if (reviewers[j]["domain"] == managerTasks[i]["domain"]) {
        let optionEl = document.createElement("option");
        optionEl.value = j;
        optionEl.innerHTML = reviewers[j]["name"];
        selectEl.appendChild(optionEl);
        atLeastOne = true;
      }
    }
    selectEl.style.display = (managerTasks[i]["taskState"] != 1) ? "none" : "block";
    selectEl.disabled = !atLeastOne;
    if (managerTasks[i]["taskState"] == 1) {
      wellDiv.appendChild(document.createElement("br"));
      wellDiv.appendChild(document.createElement("br"));
    }
    wellDiv.appendChild(selectEl);
    if (managerTasks[i]["taskState"] == 1) {
      wellDiv.appendChild(document.createElement("br"));
      wellDiv.appendChild(document.createElement("br"));
    }

    btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-success");
    btn.id = "task_" + (i + 1) + "_choose_reviewer";
    btn.innerText = "Choose reviewer!";
    btn.onclick = async function () { assignReviewer(i); }
    btn.style.display = (managerTasks[i]["taskState"] != 1) ? "none" : "block";
    btn.disabled = !atLeastOne;
    wellDiv.appendChild(btn);

    // choose bidder
    let divBidEl = document.createElement("div");
    divBidEl.className = "form-group";
    selectEl = document.createElement("select");
    selectEl.classList.add("selectpicker");
    selectEl.classList.add("form-control");
    selectEl.id = "task_" + (i + 1) + "_select_bidder";

    atLeastOne = false;

    for (let j = 0; j < managerTasks[i]["bidders"].length; j++) {
      let optionEl = document.createElement("option");
      optionEl.value = j;
      optionEl.innerHTML = managerTasks[i]["bidders"][j]["name"] + "   reputation : " + managerTasks[i]["bidders"][j]["reputation"];
      selectEl.appendChild(optionEl);
      atLeastOne = true;
    }
    divBidEl.appendChild(selectEl);
    divBidEl.style.display = (managerTasks[i]["taskState"] != 2) ? "none" : "block";
    selectEl.disabled = !atLeastOne;
    if (managerTasks[i]["taskState"] == 2) {
      wellDiv.appendChild(document.createElement("br"));
      wellDiv.appendChild(document.createElement("br"));
    }
    wellDiv.appendChild(divBidEl);
    if (managerTasks[i]["taskState"] == 2) {
      wellDiv.appendChild(document.createElement("br"));
      wellDiv.appendChild(document.createElement("br"));
    }

    btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-success");
    btn.id = "task_" + (i + 1) + "_choose_bidder";
    btn.innerText = "Choose freelancer!";
    btn.onclick = async function () { assignFreelancer(i); }
    btn.style.display = (managerTasks[i]["taskState"] != 2) ? "none" : "block";
    btn.disabled = !atLeastOne;
    wellDiv.appendChild(btn);


    mainCont.appendChild(wellDiv);
  }


}

async function addTask() {
  let domainChoice = document.getElementById("domain_task_add_id").value;
  let description = document.getElementById("descr_task_add_id").value;
  let frBounty = parseInt(document.getElementById("free_task_add_id").value);
  let revBounty = parseInt(document.getElementById("rev_task_add_id").value);

  if (description == "") {
    alert("The description field should not be empty!");
    return;
  }

  if (domainChoice == "") {
    alert("The domain field should not be empty!");
    return;
  }

  if (isNaN(revBounty)) {
    alert("The reviewer bounty field should not be empty!");
    return;
  }

  if (isNaN(frBounty)) {
    alert("The freelancer bounty field should not be empty!");
    return;
  }

  await managerContract.methods.initializeTask(description, domainChoice, frBounty, revBounty)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task created. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
      }
    });

  location.reload()
}

async function assignReviewer(index) {
  let reviewerIndex = parseInt(document.getElementById("task_" + (index + 1) + "_select_reviewer").value);

  await managerContract.methods.assignReviewer(managerTasks[index]["taskAddress"], reviewers[reviewerIndex]["reviewerAddress"])
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Reviewer assigned. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
      }
    });

  location.reload()
}

async function assignFreelancer(index) {
  let bidderIndex = parseInt(document.getElementById("task_" + (index + 1) + "_select_bidder").value);

  await managerContract.methods.assignFreelancer(managerTasks[index]["taskAddress"], managerTasks[index]["bidders"][bidderIndex]["bidderAddress"])
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Freelancer assigned. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
      }
    });

  location.reload()
}

async function cancelTask(index) {
  await managerContract.methods.cancelTask(managerTasks[index]["taskAddress"])
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task canceled. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the task was updated by somebody else");
      }
    });

  location.reload()
}

async function rejectTask(index) {
  await managerContract.methods.evaluateSolution(managerTasks[index]["taskAddress"], false)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task rejected. Reviewer notified. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the task was updated by somebody else");
      }
    });

  location.reload()
}

async function acceptTask(index) {
  await managerContract.methods.evaluateSolution(managerTasks[index]["taskAddress"], true)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task rejected. Reviewer notified. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the task was updated by somebody else");
      }
    });

  location.reload()
}