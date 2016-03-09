var http = require('http'),
	https = require('https'),
	nconf = require('nconf'),
	port = 1063;

const ONE_DAY = 24 * 60 * 60 * 1000;

function getLogUrl(request, endTime) {
	var lastPolledAt = nconf.get('polling:lastTime'),
		startTime = lastPolledAt + 1;
	
	if(!lastPolledAt) {
		var earliestStartTime = nconf.get('retentionDays') * ONE_DAY;
		startTime = earliestStartTime;
	}

	return `https://pull.logentries.com${request.url}?format=json&start=${startTime}&endTime=${endTime}`;
}

function onRequest(request, response) {
	currentTime = (new Date()).getTime();

	var url = getLogUrl(request, currentTime);

	console.log(`Request: ${request.url}`);
	console.log(`Redirect: ${url}`);

	var proxy = https.get(url, function (res) {
		res.pipe(response, {
			end: true
		});

		res.on('end', () => {
			nconf.set('polling:lastTime', currentTime);
			nconf.save();
			console.log('Redirect succeeded');
		});
	})
	.on('error', (e) => {
		console.error(e);
	});

	request.pipe(proxy, {
		end: true
	});
}

nconf.argv()
	.env()
	.file({
		file: './config.json'
	})
	.defaults({
		'polling:lastTime': 0,
		'retentionDays': 1
	});

http.createServer(onRequest).listen(port);
console.log('Listening to port: ' + port);