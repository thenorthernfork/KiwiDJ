$(document).ready(function() {
	var socket = io.connect('http://localhost:3000');

	socket.on('message', function (data) {
		alert(data.message);
	}
});