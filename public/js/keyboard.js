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
        // Example: Display the lobby ID in the UI
        document.getElementById('game-text').innerHTML = data.text;
    }    
    });
  
  // Example function to update the leaderboard on the frontend
  function updateLeaderboard(playersData) {
    // Implement your code to update the leaderboard based on the received player data
    // Example: Display players' accuracy and WPM on the leaderboard
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = ''; // Clear the current leaderboard content
    for (const playerId in playersData) {
      const playerData = playersData[playerId];
      const playerRow = document.createElement('div');
      playerRow.textContent = `Player ${playerId}: Accuracy: ${playerData.accuracy}%, WPM: ${playerData.wpm}`;
      leaderboard.appendChild(playerRow);
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

// Keyboard event listener to monitor typing and send updates to the server
document.getElementById('typing-area').addEventListener('keydown', (event) => {
    // Start the timer when the user starts typing
    if (!event.target.dataset.startTime) {
      event.target.dataset.startTime = Date.now();
    }
  });

  document.getElementById('typing-area').addEventListener('keyup', (event) => {
    const typedText = event.target.value;
    const startTime = event.target.dataset.startTime;
    sendTypedText(typedText, startTime);
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