exports.join = function(req, res){
	var room = req.params.id;
	if(rooms.has(room)){
		
	}else{
		res.redirect("/"+room+"/create");
	}
};

exports.create = function(req, res){
	var room = req.params.id;
	res.render('create', { title: 'KiwiDJ - Creating '+room, room: room });
};