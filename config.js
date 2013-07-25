module.exports = {
	secret: "",//Session Secret Message
	proxy_socket_fix: false,//use io.set("transports", ["xhr-polling", "jsonp-polling"]); fixes error if behind a reverse proxy
	address: "0.0.0.0",
	port: 3000
}