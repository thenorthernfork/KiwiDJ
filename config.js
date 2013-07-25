module.exports = {
	secret: "",//Session Secret Message
	proxy_socket_fix: false,//use io.set("transports", ["xhr-polling", "jsonp-polling"]); fixes error if behind a reverse proxy
	port: 3000
}