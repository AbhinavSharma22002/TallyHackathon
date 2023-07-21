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
async function startGame(lobby) {
  // Get a random text from the corresponding difficulty level
const randomText = await fetchText();
if(lobby.correctText!==undefined)
    lobby.correctText =  randomText
else{
  lobby = {
    correctText: randomText
  }
}
  lobby.startTime = Date.now();

  // Send the game details to all players in the lobby
  const gameDetails = {
    type: 'gameStart',
    text: randomText,
    players: lobby.players,
    startTime: Date.now(), // Start time of the game on the server-side
  };
      for(let k = 0;k<lobby.players.length;k++)
      io.to(lobby.players[k].id).emit('gameUpdate', gameDetails);
}
function lobbyUpdate(index){
  console.log(lobbies[index]);
  let interval = setInterval(() => {
    
    let diff = Date.now()-lobbies[index].startTime;
    //each lobby will match only for 1 min
    console.log(diff);
    if(diff>=20000){
      const gameUpdate = {
        type: 'endGame',
        playerData: lobbies[index].players,
      };

      
      for(let k = 0;k<lobbies[index].players.length;k++)
      io.to(lobbies[index].players[k].id).emit('gameUpdate', gameUpdate);
      clearInterval(interval);
    }
  }, 1000); // Update every 1 second
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
  return{lobby:{lobbyId:Math.random().toString(36).substring(2, 5)}};
}

// Function to calculate accuracy
function calculateAccuracy(typedText, correctText) {
  correctText = correctText.substring(0,typedText.length);
  const typedWords = typedText.trimStart().split('');
  const correctWords = correctText.trimStart().split('');
  const correctWordCount = correctWords.length;
  let matchingWordCount = 0;
  typedWords.forEach((word, index) => {
    if (correctWords[index] && word === correctWords[index]) {
      matchingWordCount++;
    }
  });
  return (matchingWordCount / correctWordCount) * 100;
}

// Function to clean up text and split into words
function cleanAndSplitText(text) {
  // Remove extra spaces and punctuation marks from the text
  const cleanedText = text.trimStart().replace(/[.,!'"?]/g, ' ');
  // Split the cleaned text into words
  const words = cleanedText.split(/\s+/);
  return words;
}

// Function to calculate words per minute (WPM)
function calculateWPM(typedText, timeInMilliseconds, correctText) {

  const typedWords = cleanAndSplitText(typedText).length;
  const timeInMinutes = timeInMilliseconds / (1000 * 60);
  const rawWPM = typedWords / timeInMinutes;

  // Adjust WPM for accuracy percentage (reduce WPM based on accuracy)
  const accuracy = calculateAccuracy(typedText, correctText);
  const adjustedWPM = rawWPM * (accuracy / 100);

  return Math.floor(adjustedWPM);
}

// Function to get the lobby ID that a player is in
function getPlayerLobby(playerId) {
  for(let i = 0;i<lobbies.length;i++){
    for(let j=0;j<lobbies[i].players.length;j++){
      if(lobbies[i].players[j].id===playerId){
        return {lobbyId:lobbies[i].lobbyId,index:i,correctText:lobbies[i].correctText,startTime:lobbies[i].startTime};
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
        lobbyId = {lobby:lobbies[i],index:i};
      }
    }

    // If no lobby has space, create a new one
    if (!lobbyId) {
      lobbyId = generateUniqueLobbyId();

      lobbies.push({type:data.type,players:[],lobbyId:lobbyId.lobby.lobbyId,difficultyLevel:data.difficultyLevel,size:MAX_PLAYERS_PER_LOBBY,correctText:'',startTime:null});
      lobbyId = {index:lobbies.length-1};
    }

    // Add the player to the lobby
    lobbies[lobbyId.index].players.push({id:socket.id});

    // Join the room associated with the lobby
    socket.join(lobbyId);
    // Notify the client about the lobby they joined
    socket.emit('joinedLobby', lobbyId);

    // Start the game if the lobby is full
    if (lobbies[lobbyId.index].players.length === MAX_PLAYERS_PER_LOBBY) {
      startGame(lobbies[lobbyId.index]); // Implement this function to start the game for a specific lobby
      if(lobbies[lobbyId.index].type!=='solo'){
        console.log(lobbyId);
        lobbyUpdate(lobbyId.index);        
      }
    }
    else{
      const gameDetails = {
        type: 'wait',
        values: MAX_PLAYERS_PER_LOBBY-lobbies[lobbyId.index].players.length
      };
      
      for(let k = 0;k<lobbies[lobbyId.index].players.length;k++)
      io.to(lobbies[lobbyId.index].players[k].id).emit('gameUpdate', gameDetails);
    }
  });

  // Handle typed text from the client along with the time taken
  socket.on('typedText', (data) => {
    const { text } = data;
    const data1 = getPlayerLobby(socket.id);

    if(data1!=null){
      
      const {lobbyId,index,startTime} = data1;
      // Assuming you have stored the correct text for the game somewhere (e.g., in a variable or database)
      const correctTex = getCorrectText(lobbyId);


      // Calculate accuracy and WPM
      if(correctTex!==''){
        const accuracy = calculateAccuracy(text.trimStart(), correctTex);
      const timeTaken = Date.now() - startTime;
      const wpm = calculateWPM(text.trimStart(), timeTaken, correctTex);
    
      
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

      if(lobbies[index].correctText.length<=text.trimStart().length){
        if(lobbies[index].type==='solo'){
        // Send the updated player data to all clients in the same lobby
      const gameUpdate = {
        type: 'endGame',
        playerData: lobbies[index].players,
      };

      
      for(let k = 0;k<lobbies[index].players.length;k++)
      io.to(lobbies[index].players[k].id).emit('gameUpdate', gameUpdate);
    }
      }
      else{
        // Send the updated player data to all clients in the same lobby
      const gameUpdate = {
        type: 'playerDataUpdate',
        playerData: lobbies[index].players,
      };

      
      for(let k = 0;k<lobbies[index].players.length;k++)
      io.to(lobbies[index].players[k].id).emit('gameUpdate', gameUpdate);
      }
  
      

      }
      
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
          lobbies[index].players.splice(i, 1);
          socket.leave(lobbyId);
          // If the lobby becomes empty, delete it
          if (lobbies[index].players.length === 0) {
            lobbies.splice(index, 1);
          }
          else if(lobbies[index].players.length<lobbies[index].size && lobbies[index].correctText===undefined){
            const gameDetails = {
              type: 'wait',
              values: lobbies[index].size-lobbies[index].players.length
            };
            for(let k = 0;k<lobbies[index].players.length;k++)
            io.to(lobbies[index].players[k].id).emit('gameUpdate', gameDetails);
          }
          else{
            
            // Send the updated player data to all clients in the same lobby
            const gameUpdate = {
              type: 'playerDataUpdate',
              playerData: lobbies[index].players,
            };
            
      
            
            for(let k = 0;k<lobbies[index].players.length;k++)
            io.to(lobbies[index].players[k].id).emit('gameUpdate', gameUpdate);
          }
        }
      }
    }
  });
});

  
  