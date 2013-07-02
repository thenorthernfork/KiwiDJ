var isConnected = false;

var sc_clientid = "cb86801e08c42af49322c0a56a82c0ec";
var sc_playing = "undefined";

function stopSoundcloud(){
	if(sc_playing !== "undefined"){
		sc_playing.stop();
	}
}

function stopMusic(){
	stopSoundcloud();
	$('#player').empty();
}

function playYoutube(videoID){
	stopMusic();
	$('#player').append('<object type="application/x-shockwave-flash" width="1" height="1" data="https://www.youtube.com/v/'+videoID+'?version=2&autoplay=1&enablejsapi=1&theme=dark" style="visibility:hidden;display:inline;float:left;"><param name="movie" value="https://www.youtube.com/v/'+videoID+'?version=2&autoplay=1&enablejsapi=1&theme=dark" /><param name="wmode" value="transparent" /></object>');
}

function playSoundcloud(trackid){
	stopMusic();
	SC.initialize({
		client_id: sc_clientid
	});

	SC.stream("/tracks/"+trackid, function(sound){
		sc_playing = sound;
		sound.play();
	});
}

function getSoundCloudTrackID(url, callback){
	$.getJSON('http://api.soundcloud.com/resolve.json?url='+url+'&client_id='+sc_clientid, function(data){
		callback(data.id);
	});
}

function swag(){
	getSoundCloudTrackID("https://soundcloud.com/64bit-2/damage", function(id){
		playSoundcloud(id);
	});
}

$(document).ready(function() {
	var socket = io.connect(window.location.origin);
	socket.on('connect', function(data) {
		socket.emit('send', {sender: "medsouz", message: "test"});
	});
	socket.on('message', function (data) {
		alert(data.sender+": "+data.message);
		console.log("got message");
	});
});