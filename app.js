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
    console.log('Listening on ' + bind);
  });

  
const lobbies = []; // Object to store active lobbies and their players


// Function to start the game for a specific lobby
async function startGame(lobbyId) {
  // Get the difficulty level of the lobby from the playersData object
  // const lobbyDifficultyLevel = playersData[lobbyId].difficultyLevel;

  // Get a random text from the corresponding difficulty level
  // const textOptions = difficultyLevels[lobbyDifficultyLevel];
  // const randomText = textOptions[Math.floor(Math.random() * textOptions.length)];
const randomText = await fetchText();

for(let i=0;i<lobbies.length;i++){
  if(lobbies[i].lobbyId===lobbyId){
    // Store the generated text for the lobby in the playersData object
    lobbies[i].correctText = randomText;
    break;
  }
}
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
  for(let i = 0;i<lobbies.length;i++){
    if(lobbies[i].lobbyId===lobbyId){
      return lobbies[i].correctText;
    }
  }
    return null;
}

// Function to generate a unique lobby ID
function generateUniqueLobbyId() {
  return Math.random().toString(36).substring(2, 5);
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
  for(let i = 0;i<lobbies.length;i++){
    for(let j=0;j<lobbies[i].players.length;j++){
      if(lobbies[i].players[j].id===playerId){
        return {lobbyId:lobbies[i].lobbyId,index:i};
      }
    }
  }
  return null; // Player not found in any lobby
}

// Handle Socket.io connections and game logic here
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Create or join a lobby
  socket.on('createOrJoin', async(data) => {
    let lobbyId = null;
    let MAX_PLAYERS_PER_LOBBY= -1; // Set the maximum number of players in a lobby
    if(data.type==="solo"){
      MAX_PLAYERS_PER_LOBBY = 1;
    }
    else{
      MAX_PLAYERS_PER_LOBBY = 4;
    }
    for(let i = 0;i<lobbies.length;i++){
      if(lobbies[i].difficultyLevel===data.difficultyLevel && lobbies[i].players.length<MAX_PLAYERS_PER_LOBBY ){
      lobbyId = lobbies[i].lobbyId;
      }
    }

    // If no lobby has space, create a new one
    if (!lobbyId) {
      lobbyId = generateUniqueLobbyId();
      lobbies.push({players:[],lobbyId,difficultyLevel:data.difficultyLevel});
      // playersData[lobbyId] = {
      //   difficultyLevel: difficultyLevel,
      // };
    }

    // Add the player to the lobby
    lobbies[lobbies.length-1].players.push({id:socket.id});

    // Join the room associated with the lobby
    socket.join(lobbyId);
    // Notify the client about the lobby they joined
    socket.emit('joinedLobby', lobbyId);

    // Start the game if the lobby is full
    if (lobbies[lobbies.length-1].players.length === MAX_PLAYERS_PER_LOBBY) {
      startGame(lobbyId); // Implement this function to start the game for a specific lobby
    }
    else{
      const gameDetails = {
        type: 'wait',
        values: MAX_PLAYERS_PER_LOBBY-lobbies[lobbies.length-1].players.length
      };
      io.to(lobbyId).emit('gameUpdate', gameDetails);
    }
  });

  // Handle typed text from the client along with the time taken
  socket.on('typedText', (data) => {
    const { text, startTime } = data;
    const data1 = getPlayerLobby(socket.id);

    if(data1!=null){
      
      const {lobbyId,index} = data1;
      // Assuming you have stored the correct text for the game somewhere (e.g., in a variable or database)
      const correctText = getCorrectText(lobbyId);
  
      // Calculate accuracy and WPM

      const accuracy = calculateAccuracy(text.trim(), correctText);
      const timeTaken = Date.now() - startTime;
      const wpm = calculateWPM(text.trim(), timeTaken);
      
  
      // Update the player's data in the object
      for(let j = 0;j<lobbies[index].players.length;j++){
        if(lobbies[index].players[j].id===socket.id){
          lobbies[index].players[j] = {
            id: socket.id,
            typedText: text,
            accuracy,
            wpm,
          }
        }
      }
  
      // Send the updated player data to all clients in the same lobby
      const gameUpdate = {
        type: 'playerDataUpdate',
        playerData: lobbies[index].players,
      };
      io.to(lobbyId).emit('gameUpdate', gameUpdate);
    }
    else{
      socket.leave(lobbyId);
    }


  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove the player from the lobby they were in
    const data = getPlayerLobby(socket.id);
    if(data==null){
      socket.leave(socket.id);
    }
    else{
      const {lobbyId,index} = data;
      console.log(lobbies[index]);
      if (lobbyId) {
        const players = lobbies[index].players;
        let i = -1;
        for(let j=0;j<players.length;j++){
          if(players[j].id===socket.id){
            i = j;
            break;
          }
        }
        if (i !== -1) {
          players.splice(i, 1);
          socket.leave(lobbyId);
          // If the lobby becomes empty, delete it
          if (players.length === 0) {
            lobbies.splice(index, 1);
          }
        }
      }
    }
  });
});

  
  