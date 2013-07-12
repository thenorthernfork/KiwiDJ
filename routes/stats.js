function getHeapData(){
	var used = (process.memoryUsage().heapUsed/1000000).toString().split(".")
	var total = (process.memoryUsage().heapTotal/1000000).toString().split(".")
	used = used[0]+"."+used[1].substring(0,2)+"MB";
	total = total[0]+"."+total[1].substring(0,2)+"MB";
	return used+"/"+total
}

//TODO: format to hours, minutes, and seconds

function uptime(){
	var uptime = process.uptime().toString().split(".");
	return uptime[0]+"."+uptime[1].substring(0,2)+" seconds";
}

exports.view = function(req, res){
  res.render('stats', { title: 'KiwiDJ - Statistics', user: req.user, heap: getHeapData(), uptime:  uptime(), nodeVersion: process.version});
};
