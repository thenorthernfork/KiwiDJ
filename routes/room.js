exports.join = function(req, res){
	var room = req.params.id;
	console.log(rooms[room]);
	if(rooms[room] != null){
		res.render("room", { title: 'KiwiDJ - '+room, user: req.user, room: room })
	}else{
		res.redirect("/"+room+"/create");
	}
};