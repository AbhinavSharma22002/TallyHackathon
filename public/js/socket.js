
const socket = io();

// Function to send the typed text to the server
function sendTypedText(text, startTime) {
  socket.emit('typedText', { text, startTime });
}

// Keyboard event listener to monitor typing
document.addEventListener('keyup', (event) => {
  const typedText = event.target.value;
    const startTime = event.target.dataset.startTime;
    sendTypedText(typedText, startTime);
});

// Handle real-time updates from the server
socket.on('gameUpdate', (data) => {
  if (data.type === 'playerDataUpdate') {
    // Handle updates to the player data (accuracy and WPM) and update the frontend
    const playersData = data.playerData;
    // Example: Update the leaderboard or player progress on the frontend
    updateLeaderboard(playersData);
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

// Example: Join a lobby when the user clicks a button (you can trigger this in your UI)
document.getElementById('join-lobby').addEventListener('click', () => {
  socket.emit('createOrJoin');
});

// Handle joinedLobby event and display the lobby ID (you can handle this in your UI)
socket.on('joinedLobby', (lobbyId) => {
  console.log('Joined lobby:', lobbyId);
  // Example: Display the lobby ID in the UI
  document.getElementById('lobby-id').textContent = `Lobby ID: ${lobbyId}`;
});
