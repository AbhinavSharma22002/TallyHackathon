const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index',{sheet:[],script:[]});
});

router.get('/solo', async function(req,res,next){
  
  let data1 = [
    {item: '/stylesheet/keyboard.css'}
  ];
  let data = [
    {item: '/js/keyboard.js'}
  ]
  res.render('solo',{sheet:data1,script:data});
});

router.get('/multiplayer',function(req,res,next){
  let data = [
    {item: '/js/socket.js'}
  ];
  res.render('multiplayer',{sheet:[],script:data});
});
module.exports = router;