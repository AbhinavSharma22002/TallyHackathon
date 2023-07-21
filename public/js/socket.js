const socket = io();


let timer,
maxTime = 60,
timeLeft = maxTime,
charIndex = 0,isTyping = 0,mistakes = 0;

//as soon as the solo page loads a new lobby should be created
window.onload = function(e){

  if(window.location.href==="http://localhost:500/solo"){
    const difficultyLevel = prompt('Enter the difficulty level (easy, medium, or hard):');
    if (difficultyLevel && ['easy', 'medium', 'hard'].includes(difficultyLevel.toLowerCase())) {
        socket.emit('createOrJoin',{type:'solo',difficultyLevel:difficultyLevel.toLowerCase()});
    } else {
      alert('Invalid difficulty level. Please enter "easy", "medium", or "hard".');
    }
  }
  else{
    const name = prompt('Enter the NickName:');
    const difficultyLevel = prompt('Enter the difficulty level (easy, medium, or hard):');
    if (difficultyLevel && ['easy', 'medium', 'hard'].includes(difficultyLevel.toLowerCase()) && name!=='' ) {
        socket.emit('createOrJoin',{type:'multiplayer',difficultyLevel:difficultyLevel.toLowerCase(),name});
    } else {
      if(name!=''){
        alert('NickName cannot be empty');
      }
      if(!(difficultyLevel && ['easy', 'medium', 'hard'].includes(difficultyLevel.toLowerCase())))
        alert('Invalid difficulty level. Please enter "easy", "medium", or "hard".');
    }
  }
    
}

// Handle joinedLobby event and display the lobby ID (you can handle this in your UI)
socket.on('joinedLobby', (lobbyId) => {
    console.log('Joined lobby:', lobbyId);
  });
  
// Function to send the typed text to the server
function sendTypedText(text, startTime) {
  const timestamp = Date.now()-startTime;
  const wpm = document.querySelector(`.wpm-${socket.id} span`).innerHTML;
    socket.emit('typedText', { text,timestamp,wpm });
  }

  socket.on('disconnect', () => {
    console.log('Disconnected from the server.');
  
    // Store a flag in localStorage to indicate that the user was disconnected
    localStorage.setItem('disconnected', 'true');
  });
  // Check for disconnection on page reload or close
window.addEventListener('beforeunload', () => {
  console.log('Disconnected from the server.');
  // Store a flag in localStorage to indicate that the user was disconnected
  localStorage.setItem('disconnected', 'true');
});
  
  // Function to show a disconnection notification to the user
  function showDisconnectionNotification() {
    // Replace this with your own custom notification implementation
    alert('You have been disconnected from the server.');
  }
  
  // Check for the disconnection flag on page load
  document.addEventListener('DOMContentLoaded', () => {
    const wasDisconnected = localStorage.getItem('disconnected');
    if (wasDisconnected === 'true') {
      // Clear the flag to avoid showing the notification repeatedly
      localStorage.removeItem('disconnected');
  
      // Show the disconnection notification
      showDisconnectionNotification();
    }
  });
  
// Handle real-time updates from the server
socket.on('gameUpdate', (data) => {
    if (data.type === 'playerDataUpdate') {
      // Handle updates to the player data (accuracy and WPM) and update the frontend
      const playersData = data.playerData;
      updateLeaderboard(playersData);
    }
    else if(data.type==="gameStart"){
      loadParagraph(data.text);
      for(const playerId in data.players){
        createResultDetails(data.players[playerId].id);
      }
      
      timer = initTimer();
    }    
    else if(data.type==="wait"){
      document.getElementById('game-text').innerHTML = `Waiting for other ${data.values} to join`;
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

  // Create "Accuracy" li element
  const liMistake = createElementWithAttributes('li', { class: `accuracy-${id}` });
  const pMistake = document.createElement('p');
  pMistake.textContent = 'Accuracy:';
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

  // Append the entire <ul> to the "resultDiv"
  resultDiv.appendChild(ul);
}
  
  function updateLeaderboard(playersData) {
    const wpm = ".wpm-%s span";
    const accuracy = ".accuracy-%s span";
      
    for (const playerId in playersData) {
      const wpmTag = document.querySelector(`${".wpm-%s span".replace("%s",playersData[playerId].id)}`);
      const accuracyTag = document.querySelector(`${".accuracy-%s span".replace("%s",playersData[playerId].id)}`);

      const playerData = playersData[playerId];
      wpmTag.innerHTML = playerData.wpm;
      accuracyTag.innerHTML = playerData.accuracy;
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

document.querySelector("#typing-area").addEventListener('input',(event)=>{
  initTyping();
});

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
timeTag = document.querySelector(".time span b");


function loadParagraph(paragraph) {
    typingText.innerHTML = "";
    paragraph.split("").forEach(char => {
        let span = `<span>${char}</span>`
        typingText.innerHTML += span;
    });
    typingText.querySelectorAll("span")[0].classList.add("active");
    document.addEventListener("keydown", () => document.querySelector("#typing-area").focus());
    typingText.addEventListener("click", () => document.querySelector("#typing-area").focus());
}

function initTyping(currId) {
    let characters = typingText.querySelectorAll("span");
    let typedChar = document.querySelector("#typing-area").value.split("")[charIndex];
    if(charIndex < characters.length - 1) {
      if(!isTyping) {
        timer = setInterval(initTimer, 1000);
        isTyping = true;
    }
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
console.log(mistakes);
        let wpm = Math.round(((charIndex - mistakes)  / 5) / (maxTime - timeLeft) * 60);
        console.log(charIndex+" "+wpm+" "+mistakes+" "+maxTime+" "+timeLeft);
        wpm = wpm < 0 || !wpm || wpm === Infinity ? 0 : wpm;
        
        let wpmTag = document.querySelector(`.wpm-${socket.id} span`);
        wpmTag.innerText = wpm;
    } 
}

function initTimer() {
    if(timeLeft > 0) {
        timeLeft--;
        timeTag.innerText = timeLeft;
        let wpm = Math.round(((charIndex - mistakes)  / 5) / (maxTime - timeLeft) * 60);
        let wpmTag = document.querySelector(`.wpm-${socket.id} span`);
        wpmTag.innerText = wpm;
        sendTypedText(document.querySelector(`#typing-area`).innerText);
    } else {
        clearInterval(timer);
    }
}
