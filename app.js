var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var logger = require('morgan');

var clientsocket = require('./sockets/clientsocket');
var fs = require('fs')
  , ini = require('ini')
global.config;
global.getconfig = function () {
  var configs = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
  config = configs;
}
global.setconfig = function () {
  fs.writeFileSync('./config_modified.ini', ini.stringify(config, { section: 'section' }))
}
getconfig();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
// var server = require('http').createServer(app);
var https_options = {
  key: fs.readFileSync("./myserver.key"),

  cert: fs.readFileSync("./pokernights_online.crt"),

  ca: [
    //fs.readFileSync('path/to/CA_root.crt'),
    fs.readFileSync('./ca_bundle.crt')
  ]
};
var server = require('https').createServer(https_options, app, function (req, res) {

  res.writeHead(200);

  res.end("Welcome to Node.js HTTPS Servern");
});

// var io = require('socket.io')(server, {'pingInterval': 1000, 'pingTimeout': 25000,'rememberTransport': false,
//     'reconnection': true, 'forceNew': [true], 'upgrade': false, 'transport': ['websocket'], 
//     'secure': true});
//console.log("Express server listening on port %d", app.address().port)

var io = require('socket.io')(server, {
  'pingInterval': 1000, 'pingTimeout': 25000, 'rememberTransport': false,
  'reconnect': false,
  'secure': true
});
//var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app.use(function(req, res, next){
//   res.io = io;
//   next();
// });
app.use(cors());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'delux')));
//app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

clientsocket.initdatabase();
io.on('connection', function (socket) {
  console.log("- One socket connected");
  clientsocket.initsocket(socket, io);
});

module.exports = { app: app, server: server };
