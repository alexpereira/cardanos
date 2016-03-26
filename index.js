var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var nickname, language;

var googleTranslate = require('google-translate')("AIzaSyCnqDQPbZOSNLPZ8QhyJcdp6LMBSkvO8Zk");

app.use('/assets', express.static('assets') );

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('nickname', function(nick){
    nickname = nick;
  });

  socket.on('language', function(lang){
    language = lang;
  });

  socket.on('chat message', function(msg){
    googleTranslate.translate(msg, language, function(err, translation) {
      io.emit('chat message', nickname + ": " + translation.translatedText);
    });
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

