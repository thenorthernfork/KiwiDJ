exports.join = function(req, res){
	var room = req.params.id;
	if(rooms.has(room)){
		res.render("room", { title: 'KiwiDJ - '+room, room: room })
	}else{
		res.redirect("/"+room+"/create");
	}
};

exports.create = function(req, res){
	var room = req.params.id;
	rooms.set(room,{users: 10});
	res.render('create', { title: 'KiwiDJ - Creating '+room, room: room });
};