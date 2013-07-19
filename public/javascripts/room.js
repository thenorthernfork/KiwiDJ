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
		sc_playing = "undefined";
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
}

function getYoutubeInfo(videoid, callback){
	$.getJSON("https://gdata.youtube.com/feeds/api/videos/"+videoid+"?v=2&alt=json", callback);
}

function playYoutube(videoID){
	stopMusic();
	$("#ytwrapper").animate({"width": "870px"}, "slow").animate({"height": "512px"}, "slow")
	yt_player.loadVideoById(videoID, 0);
	yt_player.playVideo();
	$('#source').text("Youtube");
	$('#source').attr("href","http://www.youtube.com/watch?v="+videoID);
	$('#source-icon').removeClass();
	$('#source-icon').addClass("icon-youtube");
	$('#album').attr('src', "https://i1.ytimg.com/vi/"+videoID+"/mqdefault.jpg")
	$('#ytwrapper').slideDown();
	getYoutubeInfo(videoID, function(data){
		$("#songTitle").text(data.entry.title.$t);
		$("#songArtist").text(data.entry.author[0].name.$t);
	});
}

function playSoundcloud(trackid){
	stopMusic();
	$("#canvas").animate({"width": "100%"}, "slow").animate({"height": "512px"}, "slow")
	getSoundCloudTrackInfo(trackid, function(data){
		if(data.streamable == true){
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
			$('#source').attr("href", data.permalink_url);
			if(data.artwork_url == null){
				$('#album').attr("src", data.user.avatar_url);
			}else{
				$('#album').attr("src", data.artwork_url);
			}
			$('#songTitle').text(data.title);
			$('#songArtist').text(data.user.username);
		}else{
			console.log("NOT STREAMABLE");
		}
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


function toggleView(){
	if($("#chatToggle").attr("value") == "Chat"){
		$("#people").fadeOut(function(){$("#chat").fadeIn();});
		$("#chatToggle").attr("value","People");
	}else{
		$("#chat").fadeOut(function(){$("#people").fadeIn();});
		$("#chatToggle").attr("value","Chat");
	}
}

function makeTimeStamp(){
	var date = new Date();
	var min = date.getMinutes().toString();
	if(min.length < 2){
		min = "0"+min;
	}
	var sec = date.getSeconds().toString();
	if(sec.length < 2){
		sec = "0"+sec;
	}
	return date.getHours()+":"+min+":"+sec;
}

var atChatBottom = true;

function showMessage(sender, message){
	$("#chat").append("<span style=\"float: right; margin-right: 5px\">"+makeTimeStamp()+"</span><span><strong>"+sender+"</strong> "+$("</p>").text(message).html()+"</span><hr class='noMargin'>");
	if(atChatBottom){
		$("#chat").animate({scrollTop: $("#chat").prop("scrollHeight")}, 500);
	}
}

function showNotification(message){
	$("#chat").append("<span style=\"float: right; margin-right: 5px\">"+makeTimeStamp()+"</span><span><strong>*** "+$("</p>").text(message).html()+"</strong></span><hr class='noMargin'>");
	if(atChatBottom){
		$("#chat").animate({scrollTop: $("#chat").prop("scrollHeight")}, 500);
	}
}

function updatePeople(data){
	$("#people").empty();
	for(var x = 0; x < data.length; x++){
		$("#people").append("<span>"+data[x].name+"<span><hr class='noMargin'>");
	}
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
	socket.emit('joinRoom', {roomName: roomName});
	socket.on('notification', function (data) {
		showNotification(data);
	});

	socket.on('chat', function (data) {
		showMessage(data.sender, data.message)
	});

	socket.on('people', function (data) {
		updatePeople(data);
	});

	socket.on('play', function (data) {
		if(data.type == "sc"){
			getSoundCloudTrackID(data.url, function (id){
				playSoundcloud(id);
			});
		}
		if(data.type == "yt"){
			playYoutube(data.url);
		}
	});

	$("#chatToggle").click(function(){toggleView();});
	$("#chatForm").submit(function () {
		try{
			var chat = $("#chatMessage").val();
			if(chat !== ""){
	 			socket.emit('chat', chat);
	 			//showMessage("medsouz", chat);
				$("#chatMessage").val("");
			}
		}catch(error){
			console.log(error);
		}
 		return false;
	});
	$("#chat").scroll(function() {
		if ($("#chat")[0].scrollHeight - $("#chat").scrollTop() == $("#chat").outerHeight()){
			atChatBottom = true;
		}else{
			atChatBottom = false;
		}
	});

	var c = document.getElementById("canvas");
	var ctx = c.getContext("2d");
	ctx.canvas.width = 970;//BAD: hardcoded, find some way to convert percentage into pixels
	ctx.canvas.height = 512;
	window.setInterval(function(){
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
		if(yt_player !== "undefined"){
			if(yt_player.getPlayerState() == 1){
				$("#duration").text(formatMilliseconds(yt_player.getCurrentTime() * 1000)+"/"+formatMilliseconds(yt_player.getDuration() * 1000));
			}
		}
	}, 1000 / 60);
});