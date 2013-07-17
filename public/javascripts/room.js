var isConnected = false;

var sc_clientid = "cb86801e08c42af49322c0a56a82c0ec";
var sc_playing = "undefined";
var yt_player = "undefined";

function setAudioDetails(title, artist, album){
	$("#songTitle").text(title);
	$("#songArtist").text(artist);
	if(album !== "undefined"){
		$("#album").attr("src",album);
	}else{
		$("#album").attr("src","/images/logo-512.png");
	}
}

function stopMusic(){
	if(sc_playing !== "undefined"){
		sc_playing.stop();
		$("#canvas").animate({"width": "1px"}, "slow").animate({"height": "1px"}, "slow")
	}
	if(yt_player !== "undefined"){
		yt_player.stopVideo()
		$("#ytwrapper").animate({"width": "1px"}, "slow").animate({"height": "1px"}, "slow")
	}
	$('#source').text("Unknown");
	$('#source-icon').removeClass();
	$('#source-icon').addClass("icon-question");
	setAudioDetails("Title", "Artist")
	$("#duration").text("0:00/0:00");
}

function onYouTubePlayerReady(id) {
	yt_player = document.getElementById(id);
	console.log("yt loaded");
}

function playYoutube(videoID){
	stopMusic();
	$("#ytwrapper").animate({"width": "870px"}, "slow").animate({"height": "512px"}, "slow")
	yt_player.loadVideoById(videoID, 0);
	yt_player.playVideo();
	console.log("PLAYING YT");
	$('#source').text("Youtube");
	$('#source').attr("href","http://www.youtube.com/watch?v="+videoID);
	$('#source-icon').removeClass();
	$('#source-icon').addClass("icon-youtube");
	$('#ytwrapper').slideDown();
}

function playSoundcloud(trackid){
	stopMusic();
	$("#canvas").animate({"width": "100%"}, "slow").animate({"height": "512px"}, "slow")
	if(sc_playing === "undefined"){
		SC.initialize({
			client_id: sc_clientid
		});
	}
	SC.stream("/tracks/"+trackid, {
		useEQData: true
	}, function(sound){
		sc_playing = sound;
		sound.play();
	});
	$('#source').text("Soundcloud");
	$('#source-icon').removeClass();
	$('#source-icon').addClass("icon-cloud");
	getSoundCloudTrackInfo(trackid, function(data){
		$('#source').attr("href", data.permalink_url);
		if(data.artwork_url == null){
			$('#album').attr("src", data.user.avatar_url);
		}else{
			$('#album').attr("src", data.artwork_url);
		}
		$('#songTitle').text(data.title);
		$('#songArtist').text(data.user.username);
	});
}

function getSoundCloudTrackID(url, callback){
	$.getJSON('http://api.soundcloud.com/resolve.json?url='+url+'&client_id='+sc_clientid, function(data){
		callback(data.id);
	});
}

function getSoundCloudTrackInfo(trackid, callback){
	$.getJSON('http://api.soundcloud.com/tracks/'+trackid+'.json?&client_id='+sc_clientid, function(data){
		callback(data);
	});
}

function swag(){
	getSoundCloudTrackID("https://soundcloud.com/64bit-2/1-bit-earpunch", function(id){
		playSoundcloud(id);
	});
}
function toggleView(){
	if($("#chatToggle").attr("value") == "Chat"){
		$("#people").fadeOut(function(){$("#chat").fadeIn();});
		$("#chatToggle").attr("value","People");
	}else{
		$("#chat").fadeOut(function(){$("#people").fadeIn();});
		$("#chatToggle").attr("value","Chat");
	}
}

function showMessage(sender, message){
	$("#chat").append("<span><strong>"+sender+"</strong> "+$("</p>").text(message).html()+"</span><hr class='noMargin'>");
}

function formatMilliseconds(milli){
	var seconds = Math.floor(milli/1000);
	var outSec = ((((seconds % 31536000) % 86400) % 3600) % 60).toString();
	if(outSec.length < 2){
		outSec = "0"+outSec;
	}
	return Math.floor((((seconds % 31536000) % 86400) % 3600) / 60)+":"+outSec;
}

$(document).ready(function() {
	var socket = io.connect(window.location.origin);
	socket.on('connect', function(data) {
		socket.emit('send', {sender: "medsouz", message: "test"});
	});
	socket.on('message', function (data) {
		//alert(data.sender+": "+data.message);
		console.log("got message");
	});
	$("#chatToggle").click(function(){toggleView();});
	$("#chatForm").submit(function () {
		try{
			var chat = $("#chatMessage").val();
			if(chat !== ""){
	 			console.log(chat);
	 			showMessage("medsouz", chat);
				$("#chatMessage").val("")
			}
		}catch(error){
			console.log(error);
		}
 		return false;
	});


///EXPERIMENTAL
var c = document.getElementById("canvas");
var ctx = c.getContext("2d");

window.setInterval(function(){
	ctx.canvas.width = 970;//BAD: hardcoded, find some way to convert percentage into pixels
	ctx.canvas.height = 512;
	if(sc_playing !== "undefined"){
		ctx.fillStyle='#F2F2F2';
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		for (var i = 0; i < sc_playing.eqData.length; i++) {
			var color = Math.round(sc_playing.eqData[i] * 255);
			var w = ctx.canvas.width / sc_playing.eqData.length;
			ctx.fillStyle='#'+color;
			ctx.fillRect(i * w,ctx.canvas.height,w,-(sc_playing.eqData[i] * ctx.canvas.height));
		}
		$("#duration").text(formatMilliseconds(sc_playing.position)+"/"+formatMilliseconds(sc_playing.duration));
	}
}, 1000 / 60);
swag()
window.setTimeout(function(){playYoutube("kwNssgj743s");}, 50000);
window.setTimeout(stopMusic, 60000);
});