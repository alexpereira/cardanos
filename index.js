var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var googleTranslate = require('google-translate')("AIzaSyCnqDQPbZOSNLPZ8QhyJcdp6LMBSkvO8Zk");

app.use('/assets', express.static('assets') );

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

clientList = {}
io.on('connection', function(socket){
  clientList[socket.id] = {conn: socket, language: '', nickname: ''};
  console.log('a user connected');

  socket.on('nickname', function(nick){
    clientList[socket.id].nickname = nick;
  });

  socket.on('language', function(lang){
    clientList[socket.id].language = lang;
  });

  socket.on('chat message', function(msg){
/*
    googleTranslate.detectLanguage(msg, function(err, detection) {
      clientList[socket.id].language = detection.language;
      console.log(detection.language);
    });
*/
    info = clientList[socket.id];
    for(id in clientList) {
      var info2 = clientList[id];
      if (info2.language == '') {
	  continue
      }
      a = function(conn) {
	  googleTranslate.translate(msg, info2.language, function(err, translation) {
              conn.emit('chat message', info.nickname + ": " + translation.translatedText);
	  });
      }
      a(info2.conn);
    }
  });

  socket.on('disconnect', function(){
    delete clientList[socket.id];
    console.log('user disconnected');
  });
});

http.listen(80, function(){
  console.log('listening on *:80');
});
