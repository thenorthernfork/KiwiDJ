
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , room = require('./routes/room')
  , http = require('http')
  , path = require('path')
  , engine = require('ejs-locals')
  , HashMap = require('hashmap').HashMap;

global.rooms = new HashMap();

var app = express();

// all environments
app.engine('ejs', engine);
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/:id/create', room.create);
app.get('/:id', room.join);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
