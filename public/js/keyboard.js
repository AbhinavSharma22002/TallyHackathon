const socket = io();

//as soon as the solo page loads a new lobby should be created
window.onload = function(e){
    const difficultyLevel = prompt('Enter the difficulty level (easy, medium, or hard):');
    if (difficultyLevel && ['easy', 'medium', 'hard'].includes(difficultyLevel.toLowerCase())) {
        socket.emit('createOrJoin',{type:'solo',difficultyLevel:difficultyLevel.toLowerCase()});
    } else {
      alert('Invalid difficulty level. Please enter "easy", "medium", or "hard".');
    }
}

// Handle joinedLobby event and display the lobby ID (you can handle this in your UI)
socket.on('joinedLobby', (lobbyId) => {
    console.log('Joined lobby:', lobbyId);
  });
  
// Function to send the typed text to the server
function sendTypedText(text, startTime) {
  const timestamp = Date.now()-startTime;
    socket.emit('typedText', { text,timestamp });
  }

  socket.on('disconnected',()=>{
    alert('You Were Disconnected');
  });
  
// Handle real-time updates from the server
socket.on('gameUpdate', (data) => {
    if (data.type === 'playerDataUpdate') {
      // Handle updates to the player data (accuracy and WPM) and update the frontend
      const playersData = data.playerData;
      // Example: Update the leaderboard or player progress on the frontend
      updateLeaderboard(playersData);
    }
    else if(data.type==="gameStart"){
      loadParagraph(data.text);
      console.log(data);
      // createResultDetails();
    }    
    else if(data.type==="endGame"){
      // Handle updates to the player data (accuracy and WPM) and update the frontend
      const playersData = data.playerData;
      const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = ''; // Clear the current leaderboard content
    for (const playerId in playersData) {
      const playerData = playersData[playerId];
      const playerRow = document.createElement('div');
      playerRow.textContent = `Player ${playerId}: Accuracy: ${playerData.accuracy}%, WPM: ${playerData.wpm}`;
      leaderboard.appendChild(playerRow);
    }

    document.getElementById("game-text").style.display = "none";
    document.getElementById("typing-area").style.display = "none";
    const box = document.getElementsByClassName('keyboard')[0];
    box.style.display = 'none';
    }
    });

  // Function to create and append elements with provided attributes
function createElementWithAttributes(tagName, attributes) {
  const element = document.createElement(tagName);
  for (const [attr, value] of Object.entries(attributes)) {
    element.setAttribute(attr, value);
  }
  return element;
}

// Function to create the result details and append them to the "resultDiv"
function createResultDetails(id) {
  const resultDiv = document.getElementById('leaderboard');

  // Create <ul> element with class="result-details"
  const ul = createElementWithAttributes('ul', { class: 'result-details' });

  // Create "Mistakes" li element
  const liMistake = createElementWithAttributes('li', { class: `mistake-${id}` });
  const pMistake = document.createElement('p');
  pMistake.textContent = 'Mistakes:';
  const spanMistake = document.createElement('span');
  spanMistake.textContent = '0';
  liMistake.appendChild(pMistake);
  liMistake.appendChild(spanMistake);
  ul.appendChild(liMistake);

  // Create "WPM" li element
  const liWPM = createElementWithAttributes('li', { class: `wpm-${id}` });
  const pWPM = document.createElement('p');
  pWPM.textContent = 'WPM:';
  const spanWPM = document.createElement('span');
  spanWPM.textContent = '0';
  liWPM.appendChild(pWPM);
  liWPM.appendChild(spanWPM);
  ul.appendChild(liWPM);

  // Create "Accuracy" li element
  const liAccuracy = createElementWithAttributes('li', { class: `accuracy-${id}` });
  const pAccuracy = document.createElement('p');
  pAccuracy.textContent = 'Accuracy:';
  const spanAccuracy = document.createElement('span');
  spanAccuracy.textContent = '0';
  liAccuracy.appendChild(pAccuracy);
  liAccuracy.appendChild(spanAccuracy);
  ul.appendChild(liAccuracy);

  // Append the entire <ul> to the "resultDiv"
  resultDiv.appendChild(ul);
}
  
  // Example function to update the leaderboard on the frontend
  function updateLeaderboard(playersData) {
    // Implement your code to update the leaderboard based on the received player data
    // Example: Display players' accuracy and WPM on the leaderboard
    const wpmTag = document.querySelector(".wpm span");
    const accuracyTag = document.querySelector(".accuracy span");

    // leaderboard.innerHTML = ''; // Clear the current leaderboard content
    for (const playerId in playersData) {
      const playerData = playersData[playerId];
      wpmTag.innerHTML = playerData.wpm;
      accuracyTag.innerHTML = playerData.accuracy;
      // const playerRow = document.createElement('div');
      // playerRow.textContent = `Player ${playerId}: Accuracy: ${playerData.accuracy}%, WPM: ${playerData.wpm}`;
      // leaderboard.appendChild(playerRow);
    }
  }
  
function getKey (e) {
    var location = e.location;
    var selector;
    if (location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
        selector = ['[data-key="' + e.keyCode + '-R"]']
    } else {
        var code = e.keyCode || e.which;
        selector = [
            '[data-key="' + code + '"]',
            '[data-char*="' + encodeURIComponent(String.fromCharCode(code)) + '"]'
        ].join(',');
    }
    return document.querySelector(selector);
}


var text = document.querySelector('#game-text');
var originalQueue = text.innerHTML;

  document.getElementById('typing-area').addEventListener('keyup', (event) => {
    const typedText = event.target.value;
    sendTypedText(typedText);
  });

document.body.addEventListener('keydown', function (e) {
    var key = getKey(e);
    if (!key) {
        return console.warn('No key for', e.keyCode);
    }

    key.setAttribute('data-pressed', 'on');
});

document.body.addEventListener('keyup', function (e) {
    var key = getKey(e);
  key && key.removeAttribute('data-pressed');
});






const typingText = document.getElementById('game-text'),
inpField = document.querySelector("#typing-area"),
// tryAgainBtn = document.querySelector(".content button"),
// timeTag = document.querySelector(".time span b"),
mistakeTag = document.querySelector(".mistake span"),
wpmTag = document.querySelector(".wpm span");
// cpmTag = document.querySelector(".cpm span");

// let timer,
// maxTime = 60,
// timeLeft = maxTime,
let charIndex = 0,isTyping = 0,mistakes = 0;

function loadParagraph(paragraph) {
        // Example: Display the lobby ID in the UI
    typingText.innerHTML = "";
    paragraph.split("").forEach(char => {
        let span = `<span>${char}</span>`
        typingText.innerHTML += span;
    });
    typingText.querySelectorAll("span")[0].classList.add("active");
    document.addEventListener("keydown", () => inpField.focus());
    typingText.addEventListener("click", () => inpField.focus());
}

function initTyping() {
    let characters = typingText.querySelectorAll("span");
    let typedChar = inpField.value.split("")[charIndex];
    if(charIndex < characters.length - 1) {
        if(typedChar == null) {
            if(charIndex > 0) {
                charIndex--;
                if(characters[charIndex].classList.contains("incorrect")) {
                    mistakes--;
                }
                characters[charIndex].classList.remove("correct", "incorrect");
            }
        } else {
            if(characters[charIndex].innerText == typedChar) {
                characters[charIndex].classList.add("correct");
            } else {
                mistakes++;
                characters[charIndex].classList.add("incorrect");
            }
            charIndex++;
        }
        characters.forEach(span => span.classList.remove("active"));
        characters[charIndex].classList.add("active");

        let wpm = Math.round(((charIndex - mistakes)  / 5) / (maxTime - timeLeft) * 60);
        wpm = wpm < 0 || !wpm || wpm === Infinity ? 0 : wpm;
        
        wpmTag.innerText = wpm;
        mistakeTag.innerText = mistakes;
        // cpmTag.innerText = charIndex - mistakes;
    } 
    // else {
    //     inpField.value = "";
    // }   
}

// function initTimer() {
//     if(timeLeft > 0) {
//         timeLeft--;
//         timeTag.innerText = timeLeft;
//         let wpm = Math.round(((charIndex - mistakes)  / 5) / (maxTime - timeLeft) * 60);
//         wpmTag.innerText = wpm;
//     } else {
//         clearInterval(timer);
//     }
// }

// function resetGame() {
//     loadParagraph();
//     clearInterval(timer);
//     timeLeft = maxTime;
//     charIndex = mistakes = isTyping = 0;
//     inpField.value = "";
//     timeTag.innerText = timeLeft;
//     wpmTag.innerText = 0;
//     mistakeTag.innerText = 0;
//     cpmTag.innerText = 0;
// }

// loadParagraph();
inpField.addEventListener("input", initTyping);
// tryAgainBtn.addEventListener("click", resetGame);