function Room(roomName, owner, socketIO) {
	this.roomName = roomName;
	this.owner = owner;
	this.people = [];
	this.io = socketIO;
	//
	this.songStart;
	this.songType;
	this.songURL;
	this.songDuration;
}

Room.prototype.addToDB = function(db) {
	
}

Room.prototype.sendUserList = function() {
	peeps = [];
	for(p in this.people){
		person = this.people[p];
		console.log(person);
		peeps.push({//recreating object so we dont send the socket instance to the client
			name: person.name,
			isGuest: person.isGuest
		});
	}
	this.io.sockets.in(this.roomName).emit('people', peeps);
}

Room.prototype.sendNotification = function(message) {
	console.log("["+this.roomName+"] *** "+message);
	this.io.sockets.in(this.roomName).emit('notification', message);
}

Room.prototype.getUserPosition = function(username) {
	return this.people.map(function(e) { return e.name; }).indexOf(username);
}

Room.prototype.onUserConnect = function(socket) {
	socket.join(this.roomName);
	socket.room = this.roomName;
	this.people.push({
		name: socket.name,
		isGuest: socket.isGuest,
		socket: socket
	});
	this.sendUserList();
	this.sendNotification(socket.name + " has connected to " + this.roomName);
}

Room.prototype.onUserDisconnect = function(username) {
	this.people.splice(this.getUserPosition(username), 1);
	this.sendUserList();
	this.sendNotification(username + " has disconnected from " + this.roomName);
}

Room.prototype.onChat = function(username, message) {
	person = this.people[this.getUserPosition(username)];
	if(person != null){
		this.io.sockets.in(this.roomName).emit("chat", {sender: username, message: message});
		console.log("["+this.roomName+"] <"+username+"> "+message);
	}
}

module.exports = Room;