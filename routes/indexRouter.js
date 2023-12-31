const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index',{sheet:[],script:[]});
});

router.get('/solo', async function(req,res,next){
  
  let data1 = [
    {item: '/stylesheet/keyboard.css'},
    {item: '/stylesheet/design.css'}
  ];
  let data = [
    {item: '/js/socket.js'}
  ];
  res.render('main',{sheet:data1,script:data});
});

router.get('/multiplayer',function(req,res,next){
  let data1 = [
    {item: '/stylesheet/keyboard.css'},
    {item: '/stylesheet/design.css'}
  ];
  let data = [
    {item: '/js/socket.js'}
  ]
  res.render('main',{sheet:data1,script:data});
});
module.exports = router;