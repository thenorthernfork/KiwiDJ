var express = require('express')
	, routes = require('./routes')
	, room = require('./routes/room')
	, stats = require('./routes/stats')
	, http = require('http')
	, path = require('path')
	, engine = require('ejs-locals')
	, passport = require('passport')
	, LocalStrategy = require('passport-local').Strategy
	, config = require('./config')
	, sqlite3 = require('sqlite3').verbose()
	, db = new sqlite3.Database('kiwi.db')
	, HashMap = require('hashmap').HashMap
	, GitInfo = require('gitinfojs')
	, crypto = require("crypto")
	, SQLiteStore = require('connect-sqlite3')(express)
	, socketIO = require('socket.io')
	, passportSocketIo = require("passport.socketio")
	, $ = require('jquery').create(null, "2.0");

global.rooms = new HashMap();

GitInfo.getHEAD(function(HEAD){global.gitHEAD = HEAD});
var contributors;
GitInfo.getContributors(function(con){
	for(var x = 0; x < con.length; x++){
		con[x][2] = crypto.createHash("md5").update(con[x][1]).digest("hex");
	}	
	contributors = con
}, GitInfo.NAME_AND_EMAIL);

//set up SQLite DB
db.run("create table if not exists users(id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT)");
db.run("create table if not exists rooms(id INTEGER PRIMARY KEY, name TEXT, ownerid INTEGER)");

function findById(id, fn) {
	db.get("SELECT * FROM users WHERE id=?",id, function(err, row) {
		if(!err && row){
			fn(null, row);
		}else{
			fn(null, null);
		}
	});
}

function findByUsername(username, fn) {
	db.get("SELECT * FROM users WHERE username=?",username, function(err, row) {
		if(!err && row){
			fn(null, row);
		}else{
			fn(null, null);
			console.log("Couldn't find username! "+username);
		}
	});
}

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	findById(id, function (err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy(
	function(username, password, done) {
		process.nextTick(function () {
			findByUsername(username, function(err, user) {
			if (err) { return done(err); }
			if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
			if (user.password != crypto.createHash("md5").update(password).digest("hex")) { return done(null, false, { message: 'Invalid password' }); }
			return done(null, user);
			})
		});
	}
));

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

function isNotLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) { return next(); }
  res.redirect('/')
}

function getUserFromSocket(socket){
	if(socket.handshake.user == null){
		return {name: "Guest "+Math.floor((Math.random()*9999)+1000), isGuest: true};
	}else{
		return {name: socket.handshake.user.username, isGuest: false};
	}
}

var app = express();

// all environments
app.engine('ejs', engine);
app.set('port', process.env.PORT || config.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon('public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.bodyParser());
var sessionStore = new SQLiteStore;
app.use(express.session({
	store: sessionStore, 
	secret: config.secret,
	maxAge: 7 * 24 * 60 * 60 * 1000
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.cookieParser());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/rooms', function(req, res){
	res.render('rooms', { title: 'KiwiDJ - Rooms', user: req.user });
});
app.get('/stats', stats.view);
app.get('/about', function(req, res){
	res.render('about', { title: 'KiwiDJ - About', user: req.user, contributors: contributors });
});
app.get('/login', isNotLoggedIn, function(req, res){
	res.render('login', { title: 'KiwiDJ - Login', user: req.user });
});
app.post('/login', passport.authenticate('local', { failureRedirect: '/login'}), function(req, res) {
	res.redirect('/');
});
app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});
app.get('/register', isNotLoggedIn, function(req, res){
	res.render('register', { title: 'KiwiDJ - Register', user: req.user });
});
app.post('/register', function(req,res){
	var reg = req;
	if(/^[a-z0-9_-]{2,15}$/.test(req.body.username.toLowerCase())){
		if(req.body.password == req.body.passwordconfirm){
			db.get("SELECT * FROM users WHERE username=?",req.body.username, function(err, row) {
				if(!row && !err){
					console.log("Creating user "+reg.body.username);
					db.run("INSERT INTO users VALUES (NULL, ?, ?, ?)", reg.body.username, crypto.createHash("md5").update(reg.body.password).digest("hex"), reg.body.email);
					res.redirect("/login");
				}else{
					res.redirect('/register');
				}
			});
		}
	}else{
		console.log("Username did not match regex "+req.body.username.toLowerCase());
		res.redirect('/register');
	}
});
app.get('/:id/create', isLoggedIn, room.create);
app.get('/:id', /*isLoggedIn,*/ room.join);

var io = socketIO.listen(app.listen(app.get('port'), config.address), {log: false});

io.set("authorization", passportSocketIo.authorize({
	cookieParser: express.cookieParser,
	key:          'connect.sid',
	secret:       config.secret,
	store:        sessionStore,
	fail: function(data, accept) {
		//we will allow this anyway for guests
		accept(null, true);
	},
	success: function(data, accept) {
		accept(null, true);
	}
}));

if(config.proxy_socket_fix){
	io.set("transports", ["xhr-polling", "jsonp-polling"]);
}

function getPeopleInRoom(roomName){
	var sockets = Object.keys(io.sockets.sockets);
	var people = [];
	for(var x = 0; x < sockets.length; x++){
		var sock = io.sockets.sockets[sockets[x]];
		if(sock.room == roomName && !sock.disconnected){
			people[x] = {name: sock.name, isGuest: sock.isGuest};
		}else{
			console.log(sock.name +" is in room " + sock.room + " | disconnect: " + sock.disconnected);
		}
	}
	io.sockets.in(roomName).emit('people', people);
}

var sc_clientid = "cb86801e08c42af49322c0a56a82c0ec";

var songStart;
var songType;
var songURL;
var songDuration;

function playSong(socket, type, url){
	songStart = Date.now() + 2000;//2 second buffer time sounds good to me.
	songType = type;
	songURL = url;
	if(type == "sc"){
		$.getJSON('http://api.soundcloud.com/tracks/'+url+'.json?&client_id='+sc_clientid, function(data){
			songDuration = data.duration;
			console.log("Timing out song in "+songDuration);
			setTimeout(function(){console.log("Stopping song, duration over!");io.sockets.in(socket.room).emit('stop');io.sockets.in(socket.room).emit('notification', "Song has ended");}, songDuration);
			io.sockets.in(socket.room).emit('notification', socket.name + " is now playing " + data.title + " by "+data.user.username);
			io.sockets.in(socket.room).emit('play', {type: type, url: url, time: 0});
		});
	}
}

function getCurrentSong(socket){
	if(songStart != null){
		console.log("Starting at "+(Date.now() - songStart)+" milliseconds");
		socket.emit('play', {type: songType, url: songURL, time: Date.now() - songStart});
	}
}

io.sockets.on('connection', function (socket) {
	try{
	socket.name = getUserFromSocket(socket).name;
	socket.isGuest = getUserFromSocket(socket).isGuest;
	console.log("got conn from "+socket.name+" | isGuest: "+socket.isGuest+" | IP: "+socket.handshake.address.address+":"+socket.handshake.address.port);
	//socket.emit('message', { sender: "medsouz", message: "test" });
	socket.on('joinRoom', function (data) {
		if(!rooms.has(data.roomName)){
			socket.disconnect();
			console.log("Nice try!");
		}else{
			console.log(socket.name + " joined room "+data.roomName);
			socket.join(data.roomName);
			socket.room = data.roomName;
			io.sockets.in(socket.room).emit('notification', socket.name + " has connected to " + socket.room);
			getPeopleInRoom(socket.room);
			getCurrentSong(socket);
			socket.on('chat', function (data) {
				if(data != null){
					if(data.length > 4 ){
						if(data.substring(0, 4) == "!sc "){
							playSong(socket, "sc", data.substring(4));
						}
						if(data.substring(0, 4) == "!yt "){
							io.sockets.in(socket.room).emit('play', {type: "yt", url: data.substring(4)});
						}
					}
					io.sockets.in(socket.room).emit('chat', {sender: socket.name, message: data});
				}
			});

			socket.on('disconnect', function (data) {
				io.sockets.in(socket.room).emit('notification', socket.name + " has disconnected");
				getPeopleInRoom(socket.room);
			});
		}
	});
	}catch(err){
		console.log("A user caused "+err);
		socket.disconnect();
	}

});

console.log("KiwiDJ Started. Running on port "+(process.env.PORT || config.port));