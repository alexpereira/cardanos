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
//app.use(express.static(__dirname + '/assets'));

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

googleTranslate.translate('Hey man, my name is Alex and I am amazing!', 'es', function(err, translation) {
  console.log(translation.translatedText);
});