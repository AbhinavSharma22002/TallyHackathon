const createError = require('http-errors');

require('dotenv').config({path:__dirname+'/bin/.env'})
const express = require('express');
const app = express();
const path = require('path');
const logger = require('morgan');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/indexRouter.js');
const fetchText = require('./utils/fetchText');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);


app.use(function(req, res, next) {
    next(createError(404));
  });
  
  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });
  
  var debug = require('debug')('speedTyper:server');
  var http = require('http');


  
  app.set('port', process.env.PORT );
  
  
  var server = http.createServer(app);
  server.listen(process.env.PORT);
  const io = socketIO(server);
  server.on('listening', ()=>{
    var addr = server.address();
    var bind = typeof addr === 'string'? 'pipe ' + addr: 'port ' + addr.port;
    console.log(addr);
    console.log('Listening on ' + bind);
  });

  
const MAX_PLAYERS_PER_LOBBY = 1; // Set the maximum number of players in a lobby
const lobbies = {}; // Object to store active lobbies and their players
const playersData = {}; // Object to store players' data (progress, accuracy, WPM)


// Function to start the game for a specific lobby
async function startGame(lobbyId) {
  // Get the difficulty level of the lobby from the playersData object
  // const lobbyDifficultyLevel = playersData[lobbyId].difficultyLevel;

  // Get a random text from the corresponding difficulty level
  // const textOptions = difficultyLevels[lobbyDifficultyLevel];
  // const randomText = textOptions[Math.floor(Math.random() * textOptions.length)];
const randomText = await fetchText();
// Create the playersData object for the lobby if it doesn't exist
if (!playersData[lobbyId]) {
  playersData[lobbyId] = {};
}

// Store the generated text for the lobby in the playersData object
playersData[lobbyId].correctText = randomText;
  // Send the game details to all players in the lobby
  const gameDetails = {
    type: 'gameStart',
    text: randomText,
    startTime: Date.now(), // Start time of the game on the server-side
  };
  io.to(lobbyId).emit('gameUpdate', gameDetails);
}
// Function to get the correct text for a specific lobby
function getCorrectText(lobbyId) {
  // Ensure that the playersData object exists for the lobby
  if (!playersData[lobbyId]) {
    return null;
  }

  // Assuming you have stored the correct text in the playersData object during the startGame function
  return playersData[lobbyId].correctText;
}

// Function to generate a unique lobby ID
function generateUniqueLobbyId() {
  return Math.random().toString(36).substr(2, 5);
}

// Function to calculate accuracy
function calculateAccuracy(typedText, correctText) {
  const correctChars = typedText.split('').filter((char, index) => char === correctText[index]);
  const accuracy = (correctChars.length / correctText.length) * 100;
  return accuracy.toFixed(2); // Return accuracy rounded to two decimal places
}

// Function to calculate words per minute
function calculateWPM(typedText, timeTaken) {
  const words = typedText.split(' ').length;
  const minutes = timeTaken / 60000; // Convert milliseconds to minutes
  const wpm = (words / minutes).toFixed(0);
  return wpm;
}

// Function to get the lobby ID that a player is in
function getPlayerLobby(playerId) {
  for (const [lobbyId, players] of Object.entries(lobbies)) {
    if (players.includes(playerId)) {
      return lobbyId;
    }
  }
  return null; // Player not found in any lobby
}

// Handle Socket.io connections and game logic here
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Create or join a lobby
  socket.on('createOrJoin', async() => {
    let lobbyId = null;

    // Check if any lobby has space for more players
    for (const [id, players] of Object.entries(lobbies)) {
      // && playersData[id].difficultyLevel === difficultyLevel
      if (players.length < MAX_PLAYERS_PER_LOBBY ) {
        lobbyId = id;
        break;
      }
    }

    // If no lobby has space, create a new one
    if (!lobbyId) {
      lobbyId = generateUniqueLobbyId();
      lobbies[lobbyId] = [];
      // playersData[lobbyId] = {
      //   difficultyLevel: difficultyLevel,
      // };
    }

    // Add the player to the lobby
    lobbies[lobbyId].push(socket.id);

    // Join the room associated with the lobby
    socket.join(lobbyId);
    // Notify the client about the lobby they joined
    socket.emit('joinedLobby', lobbyId);

    // Start the game if the lobby is full
    if (lobbies[lobbyId].length === MAX_PLAYERS_PER_LOBBY) {
      startGame(lobbyId); // Implement this function to start the game for a specific lobby
    }
  });

  // Handle typed text from the client along with the time taken
  socket.on('typedText', (data) => {
    const { text, startTime } = data;
    const lobbyId = getPlayerLobby(socket.id);

    // Assuming you have stored the correct text for the game somewhere (e.g., in a variable or database)
    const correctText = getCorrectText(lobbyId);

    // Calculate accuracy and WPM
    const accuracy = calculateAccuracy(text, correctText);
    const timeTaken = Date.now() - startTime;
    const wpm = calculateWPM(text, timeTaken);

    // Update the player's data in the object
    playersData[socket.id] = {
      typedText: text,
      accuracy,
      wpm,
    };

    // Send the updated player data to all clients in the same lobby
    const gameUpdate = {
      type: 'playerDataUpdate',
      playerData: playersData,
    };
    console.log(playersData);
    io.to(lobbyId).emit('gameUpdate', gameUpdate);
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove the player from the lobby they were in
    const lobbyId = getPlayerLobby(socket.id);
    console.log(lobbyId);
    if (lobbyId) {
      const players = lobbies[lobbyId];
      const index = players.indexOf(socket.id);
      console.log(index);
      if (index !== -1) {
        players.splice(index, 1);
        socket.leave(lobbyId);
        // If the lobby becomes empty, delete it
        if (players.length === 0) {
          delete lobbies[lobbyId];
          delete playersData[lobbyId];
        }
      }
    }
  });
});

  
  