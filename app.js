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
	, passportSocketIo = require("passport.socketio");

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
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.bodyParser());
var sessionStore = new SQLiteStore;
app.use(express.session({
	store: sessionStore, 
	secret: config.secret 
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
	if(/^[a-z0-9_-]{2,15}$/.test(req.body.username)){
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
		console.log("Username did not match regex");
		res.redirect('/register');
	}
});
app.get('/:id/create', isLoggedIn, room.create);
app.get('/:id', /*isLoggedIn,*/ room.join);

var io = socketIO.listen(app.listen(app.get('port')), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

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

io.sockets.on('connection', function (socket) {
	console.log("got conn from "+getUserFromSocket(socket).name);
	//socket.emit('message', { sender: "medsouz", message: "test" });
	socket.on('send', function (data) {
		io.sockets.emit('message', data);
	});
});
