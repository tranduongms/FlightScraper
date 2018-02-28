const fs = require('fs');

var scrapers = [
	'CGN',
	'DUS',
	'FRA',
	'MUC',
	'SXF',
	'TXL',
	'HAM',
	'STR',
	'HAJ',
	'NUE',
	'BRE',
	'HHN',
	'LEJ',
	'DTM',
	'NRN',
	'DRS'
];

function collecting () {
	try {
		var dGMT = new Date();
		var d = new Date(dGMT.getTime()+7200000); // Time in GMT+2
		var yyyy = d.getFullYear().toString();
		var mm = (d.getMonth()+1) < 10 ? '0'+(d.getMonth()+1) : (d.getMonth()+1);
		var dd = d.getDate() < 10 ? '0'+d.getDate() : d.getDate();

		var jsonOutFile = '/var/www/html/json/'+yyyy+mm+dd+'.json';
		var scrapedFlights = [];

		for (var i = 0; i < scrapers.length; i++) {
			try {
				var jsonFile = '/var/www/html/json/'+yyyy+mm+dd+'.'+scrapers[i]+'.json';
				var content = fs.readFileSync(jsonFile);
				var flights = JSON.parse(content);
				if (flights && flights.length > 0) {
					scrapedFlights = scrapedFlights.concat(flights);
				}
			} catch (e) {
				console.log(e);
			}
		}

		fs.writeFile(jsonOutFile, JSON.stringify(scrapedFlights, null, 2), (err) => {
			if (err) throw err;
			console.log('JSON collecting done');
		});

	} catch (e) {
		console.log(e);
	}
}

collecting();
setInterval(collecting, 300000);