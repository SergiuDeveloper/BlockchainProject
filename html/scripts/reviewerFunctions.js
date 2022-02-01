var contractAddress, mkAddr, marketplaceContract, reviewerContract, accountAddr;
var tasksToReview = [];

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
  if (actualAccountType != "reviewer") {
    window.location.href = actualAccountType + ".html";
  }

  // get instance of the reviewer contract
  reviewerContract = new web3.eth.Contract(reviewerABI, accountAddr);

  // update fields
  document.getElementById("owner_addr").innerHTML = contractAddress;
  document.getElementById("reviewer_addr").innerHTML = accountAddr;

  let reviewerName = await reviewerContract.methods.getName()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("reviewer_name").innerHTML = reviewerName;
  document.getElementById("mk_addr").innerHTML = mkAddr;

  balance = await marketplaceContract.methods.getBalance(accountAddr)
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("token_balance").innerHTML = balance;

  domain = await reviewerContract.methods.getDomain()
    .call({ from: contractAddress })
    .then(function (result) {
      return result;
    });

  document.getElementById("domain").innerHTML = domain;

  getTasksToReview().then(displayMyTasks);
}

async function rejectTaskReview(index) {
  await reviewerContract.methods.reviewSolution(tasksToReview[index]["taskAddress"], false)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task rejected after review. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the task was updated by somebody else");
      }
    });

  location.reload()
}

async function approveTaskReview(index) {
  await reviewerContract.methods.reviewSolution(tasksToReview[index]["taskAddress"], true)
    .send({ from: contractAddress })
    .then(function (result) {
      console.log("Task accepted after review. Transaction hash: " + result);
    })
    .catch(function (error) {
      if (error) {
        console.log("error is " + error);
        console.log("the task was updated by somebody else");
      }
    });

  location.reload()
}

async function getTasksToReview() {
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
    let taskReviewerAddr = await marketplaceContract.methods.getTaskReviewer(taskAddr)
      .call({ from: contractAddress })
      .then(function (result) {
        return result;
      });

    // task should be reviewed by this account
    if (taskReviewerAddr == accountAddr) {
      let taskState = await taskContract.methods.getTaskState()
        .call({ from: contractAddress })
        .then(function (result) {
          return result;
        });

      console.log(taskState);

      // task is in need-review state
      if (taskState == 5) {
        console.log("asd");
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



        let solution = await taskContract.methods.getSolution()
          .call({ from: contractAddress })
          .then(function (result) {
            return result;
          });

        tasksToReview.push({
          domain: domain,
          description: description,
          freelancerBounty: frBounty,
          reviewerBounty: revBounty,
          taskState: taskState,
          solution: solution,
          taskAddress: taskAddr,
          index: i
        });
      }
    }
  }
}


async function displayMyTasks() {
  let mainCont = document.getElementById("my_tasks");
  for (let i = 0; i < tasksToReview.length; i++) {
    let wellDiv = document.createElement("div");
    wellDiv.id = "task_" + (i + 1);
    wellDiv.classList.add("well");
    wellDiv.classList.add("well-small");

    // task title
    let taskTitle = document.createElement("legend");
    taskTitle.className = "lead";
    taskTitle.textContent = "Task #" + tasksToReview[i]["index"];
    wellDiv.appendChild(taskTitle);

    // task address
    let fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Task address:</strong>";
    wellDiv.appendChild(fieldText);
    let spanElem = document.createElement("span");
    spanElem.id = "task_" + (i + 1) + "_addr";
    spanElem.className = "col";
    spanElem.innerHTML = "    " + tasksToReview[i]["taskAddress"];
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
    spanElem.innerHTML = "    " + tasksToReview[i]["freelancerBounty"];
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
    spanElem.innerHTML = "    " + tasksToReview[i]["reviewerBounty"];
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
    textareaElem.innerHTML = tasksToReview[i]["description"];
    wellDiv.appendChild(textareaElem);

    // solution
    fieldText = document.createElement("label");
    fieldText.className = "col";
    fieldText.innerHTML = "<strong>Solution:</strong>";
    wellDiv.appendChild(fieldText);
    textareaElem = document.createElement("textarea");
    textareaElem.className = "form-control";
    textareaElem.id = "task_" + (i + 1) + "_solution";
    textareaElem.innerHTML = tasksToReview[i]["solution"];
    textareaElem.readOnly = true;
    wellDiv.appendChild(textareaElem);
    wellDiv.appendChild(document.createElement("br"));

    // send solution
    let btnDiv = document.createElement("div");
    btnDiv.className = "btn-toolbar";
    let btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-danger");
    btn.id = "task_" + (i + 1) + "_reject";
    btn.onclick = async function () { rejectTaskReview(i); }
    btn.innerText = "Reject solution!";
    btnDiv.appendChild(btn);
    btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add("btn-success");
    btn.id = "task_" + (i + 1) + "_approve";
    btn.onclick = async function () { approveTaskReview(i); }
    btn.innerText = "Approve solution!";
    btnDiv.appendChild(btn);
    wellDiv.appendChild(btnDiv);

    mainCont.appendChild(wellDiv);
  }
}