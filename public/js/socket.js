const socket = io();


let timer,
maxTime = 60,
timeLeft = maxTime,
charIndex = 0,isTyping = 0,mistakes = 0;

//as soon as the solo page loads a new lobby should be created
window.onload = function(e){
  
  if(window.location.href==="http://localhost:500/solo"){
    // const difficultyLevel = prompt('Enter the difficulty level (easy, medium, or hard):');
    const difficultyLevel = sessionStorage.getItem(`difficultyLevel`);
    if (difficultyLevel && ['easy', 'medium', 'hard'].includes(difficultyLevel.toLowerCase())) {
        socket.emit('createOrJoin',{type:'solo',difficultyLevel:difficultyLevel.toLowerCase()});
    } else {
      alert('Invalid difficulty level. Please enter "easy", "medium", or "hard".');
    }
  }
  else{
    // const name = prompt('Enter the NickName:');
    const name = sessionStorage.getItem(`name`);
    // const difficultyLevel = prompt('Enter the difficulty level (easy, medium, or hard):');
    const difficultyLevel = sessionStorage.getItem(`difficultyLevel`);
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
function sendTypedText(text) {
  const wpm = document.querySelector(`.wpm-${socket.id} span`).innerHTML;
    socket.emit('typedText', { text,wpm });
  }

  socket.on('disconnect', () => {
    console.log('Disconnected from the server.');
    // Store a flag in sessionStorage to indicate that the user was disconnected
    sessionStorage.setItem(`disconnected`, 'true');
  });
  // Check for disconnection on page reload or close
window.addEventListener('beforeunload', () => {
  console.log('Disconnected from the server.');
  // Store a flag in sessionStorage to indicate that the user was disconnected
  sessionStorage.setItem(`disconnected`, 'true');
});
  

  // Function to show a disconnection notification to the user
  function showDisconnectionNotification() {
  alert('You were disconnected.');

}
  
  // Check for the disconnection flag on page load
  document.addEventListener('DOMContentLoaded', () => {
    const wasDisconnected = sessionStorage.getItem(`disconnected`);
    if (wasDisconnected === 'true') {
      // Clear the flag to avoid showing the notification repeatedly
      sessionStorage.removeItem(`disconnected`);
  
      // Show the disconnection notification
      showDisconnectionNotification();
    }
  });
  
// Handle real-time updates from the server
socket.on('gameUpdate', (data) => {
    if (data.type === 'playerDataUpdate') {
      // Handle updates to the player data (accuracy and WPM) and update the frontend
      const playersData = data.playerData;
      timeLeft = data.startTime;

      let wpm = Math.round(((charIndex - mistakes)  / 5) / (maxTime - timeLeft) * 60);
        wpm = wpm < 0 || !wpm || wpm === Infinity ? 0 : wpm;
        document.querySelector(`.wpm-${socket.id} span`).innerText = wpm;

        document.querySelector(".time span").innerText=timeLeft;
      updateLeaderboard(playersData);
    }
    else if(data.type==="gameStart"){
      loadParagraph(data.text);
      for(const playerId in data.players){
        createResultDetails(data.players[playerId].id);
      }
      timeLeft = data.startTime;
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
      
    for (const playerId in playersData) {
      const wpmTag = document.querySelector(`${".wpm-%s span".replace("%s",playersData[playerId].id)}`);
      const accuracyTag = document.querySelector(`${".accuracy-%s span".replace("%s",playersData[playerId].id)}`);

      const playerData = playersData[playerId];
      if(playerData.wpm===undefined)
      wpmTag.innerHTML = 'Yet to Start';
      else
      wpmTag.innerHTML = playerData.wpm;
      if(playerData.accuracy===undefined)
      accuracyTag.innerHTML = 'Yet to Start';
      else
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
  sendTypedText(document.querySelector('#typing-area').value);
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


const typingText = document.getElementById('game-text');


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

function initTyping() {
    let characters = typingText.querySelectorAll("span");
    let typedChar = document.querySelector("#typing-area").value.split("")[charIndex];
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
        
        let wpmTag = document.querySelector(`.wpm-${socket.id} span`);
        wpmTag.innerText = wpm;
    } 
}
