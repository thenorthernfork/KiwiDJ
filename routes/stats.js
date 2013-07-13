function getHeapData(){
	var used = (process.memoryUsage().heapUsed/1000000).toString().split(".")
	var total = (process.memoryUsage().heapTotal/1000000).toString().split(".")
	used = used[0]+"."+used[1].substring(0,2)+"MB";
	total = total[0]+"."+total[1].substring(0,2)+"MB";
	return [used+"/"+total, (process.memoryUsage().heapUsed/process.memoryUsage().heapTotal) * 100];
}

//TODO: format to hours, minutes, and seconds

function uptime(){
	var uptime = process.uptime().toString().split(".");
	var seconds = uptime[0]
	var numdays = Math.floor(seconds / 86400);
	var numhours = Math.floor((seconds % 86400) / 3600);
	var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
	var numseconds = ((seconds % 86400) % 3600) % 60;

	return numdays + " days, " + numhours + " hours, " + numminutes + " minutes, " + numseconds + " seconds";
}

exports.view = function(req, res){
  res.render('stats', { title: 'KiwiDJ - Statistics', user: req.user, heap: getHeapData(), uptime:  uptime(), nodeVersion: process.version});
};
