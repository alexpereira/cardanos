var RColor = require('./rcolor.js')();
var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var execSync = require('exec-sync');

function language(text) {
    console.log("Fetching language");
    command = __dirname + "/haven_request.sh sync identifylanguage \"text=" + text.replace("\"", "\\\"") + "\"";
    json_response = execSync(command);
    return JSON.parse(json_response).language_iso639_2b;
}

function sentiment(text, lang) {
    safe_text = text.replace("\"", "\\\"");
    safe_lang = lang.replace("\"", "\\\"");
    command = __dirname + "/haven_request.sh sync analyzesentiment \"text=" + safe_text + "\" \"language=" + safe_lang + "\"";
    json_response = execSync(command);
    return JSON.parse(json_response).aggregate;
}

var rcolor = new RColor;

var googleTranslate = require('google-translate')("AIzaSyCnqDQPbZOSNLPZ8QhyJcdp6LMBSkvO8Zk");

app.use('/assets', express.static('assets') );

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

HAVEN_MIN_LENGTH=15 // Haven is weird with small messages when detecting language
clientList = {}
io.on('connection', function(socket){
  clientList[socket.id] = {conn: socket, language: '', nickname: '', color: rcolor.get(true, 0.3, 0.99), auto: true};
  console.log('a user connected');

  socket.on('nickname', function(nick){
      msg = "User " + nick + " has joined.";
      for(id in clientList) {
	  var info2 = clientList[id];
	  if (info2.language == '' || id == socket.id) {
	      continue
	  }
	  a = function(conn) {
	      googleTranslate.translate(msg, info2.language, function(err, translation) {
		  conn.emit('chat message', {text: translation.translatedText, bgcolor: "black", txtcolor: "white"});
	      });
	  }
	  a(info2.conn);
      }

    clientList[socket.id].nickname = nick;
  });

  socket.on('language', function(lang){
    clientList[socket.id].language = lang;
    if (lang != 'auto123456789') {
	clientList[socket.id].auto = false;
    } else {
	clientList[socket.id].language = "en"; // default
    }
  });

  socket.on('chat message', function(msg){
    if (clientList[socket.id].auto && msg.length >= HAVEN_MIN_LENGTH) {
	new_lang = language(msg);
	if (new_lang != 'UND') {
	    clientList[socket.id].language = new_lang;
	}
    }

    info = clientList[socket.id];
    for(id in clientList) {
      var info2 = clientList[id];
      if (info2.language == '') {
	  continue
      }
      a = function(conn) {
	  googleTranslate.translate(msg, info2.language, function(err, translation) {
	      if (typeof translation != 'undefined') {
		  msg_to_send = translation.translatedText;
	      } else {
		  msg_to_send = msg;
	      }
              conn.emit('chat message', {text: info.nickname + ": " + msg_to_send, bgcolor: info.color, txtcolor: "black"});
	  });
      }
      a(info2.conn);
    }
  });

  socket.on('disconnect', function(){
      nick = clientList[socket.id].nickname;
      msg = "User " + nick + " has left.";
      for(id in clientList) {
	  var info2 = clientList[id];
	  if (info2.language == '' || id == socket.id) {
	      continue
	  }
	  a = function(conn) {
	      googleTranslate.translate(msg, info2.language, function(err, translation) {
		  if (typeof translation != 'undefined') {
		      msg_to_send = translation.translatedText;
		  } else {
		      msg_to_send = msg;
		  }
		  conn.emit('chat message', {text: msg_to_send, bgcolor: "black", txtcolor: "white"});
	      });
	  }
	  a(info2.conn);
      }
    delete clientList[socket.id];
    console.log('user disconnected');
  });
});

http.listen(80, function(){
  console.log('listening on *:80');
});
