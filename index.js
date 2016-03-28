var RColor = require('./rcolor.js')();
var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var execSync = require('exec-sync');

function language(text) {
    // if (Math.random() > 0.2) {
    // 	return;
    // }
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

function sendMessage(fromlang, toid, msg, bg, fg, conn) {
    info = clientList[toid];
    googleTranslate.translate(msg, fromlang, info.language, function(err, translation) {
	if (typeof translation != 'undefined') {
	    msg_to_send = translation.translatedText;
	} else {
	    msg_to_send = msg;
	}
	conn.emit('chat message', {text: msg_to_send, bgcolor: bg, txtcolor: fg});
    });
}

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
	  sendMessage('eng', id, msg, "black", "white", clientList[id].conn);
      }

    clientList[socket.id].nickname = nick;
  });

  socket.on('language', function(lang){
    clientList[socket.id].language = lang;
    if (lang != 'auto123456789') {
	clientList[socket.id].auto = false;
    } else {
	clientList[socket.id].language = "eng"; // default
    }
  });

  socket.on('chat message', function(msg){
    if (clientList[socket.id].auto && msg.length >= HAVEN_MIN_LENGTH) {
	new_lang = language(msg);
	if (new_lang != 'UND') {
	    sendMessage('eng', socket.id, "Your language was detected as " + new_lang, "black", "white", clientList[socket.id].conn);
	    clientList[socket.id].language = new_lang;
	    clientList[socket.id].auto = false;
	}
    }

    info = clientList[socket.id];
      // Do sentiment analysis
      s = sentiment(msg,info.language);
      if (typeof s != 'undefined') {
	  s = s.sentiment;
	  switch(s) {
	  case 'positive': emot = ' ( :) )'; break;
	  case 'neutral': emot = ' ( :| )'; break;
	  case 'negative': emot = ' ( :( )'; break;
	  default: emot = '';
	  }
      } else {
	  emot = ''
      }
    for(id in clientList) {
      var info2 = clientList[id];
      if (info2.language == '') {
	  continue
      }

      a = function(conn, nickname, msg) {
	  googleTranslate.translate(msg, info.language, info2.language, function(err, translation) {
	      if (typeof translation != 'undefined') {
		  msg_to_send = translation.translatedText;
	      } else {
		  msg_to_send = msg;
	      }
              conn.emit('chat message', {otext: nickname + emot + ": " + msg, text: nickname + emot + ": " + msg_to_send, bgcolor: info.color, txtcolor: "black"});
	  });
      }
      a(info2.conn, info.nickname, msg);
    }
  });

  socket.on('disconnect', function(){
      nick = clientList[socket.id].nickname;
      if (nick == '') {
	  delete clientList[socket.id];
	  console.log('user disconnected');
	  return;
      }
      msg = "User " + nick + " has left.";
      for(id in clientList) {
	  var info2 = clientList[id];
	  if (info2.language == '' || id == socket.id) {
	      continue
	  }
	  a = function(conn, msg) {
	      googleTranslate.translate(msg, 'eng', info2.language, function(err, translation) {
		  if (typeof translation != 'undefined') {
		      msg_to_send = translation.translatedText;
		  } else {
		      msg_to_send = msg;
		  }
		  conn.emit('chat message', {text: msg_to_send, bgcolor: "black", txtcolor: "white"});
	      });
	  }
	  a(info2.conn, msg);
      }
    delete clientList[socket.id];
    console.log('user disconnected');
  });
});

http.listen(80, function(){
  console.log('listening on *:80');
});
