// LEJ Airport

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const airline_iata = require('./airline_iata.js');

const MinTimeAsDelayed = 5; // 5 minutes

var ScrapedFlights = [];

var outFile;

var d;
var yyyy;
var mm;
var dd;
var hh;

function scraping () {
	var dGMT = new Date();
	d = new Date(dGMT.getTime()+7200000); // Time in GMT+2
	hh = d.getHours();
	yyyy = d.getFullYear().toString();
	mm = (d.getMonth()+1) < 10 ? '0'+(d.getMonth()+1) : (d.getMonth()+1);
	dd = d.getDate() < 10 ? '0'+d.getDate() : d.getDate();
	if (hh >=6 ) {
		outFile = '/var/www/html/json/'+yyyy+mm+dd+'.LEJ.json';
		ScrapedFlights = [];
		fs.readFile(outFile, (err, data) => {
			if (!err) {
				old = JSON.parse(data);
				if (old && old.length > 0) {
					ScrapedFlights = old;
				}
			}
			scrapeArrival();
		});
	}
}

function scrapeArrival () {
	request('https://www.leipzig-halle-airport.de/en/arrivals-and-departures-20.html?date='+dd+'.'+mm+'.'+yyyy+'&q=', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('.flights .main.row').each(function (idx, elm) {
					var row = $(elm);
					var flyCode = row.find('.flight-number .index').first().text().trim();
					var statusText = row.find('.status .index').first().text().trim();
					var planned = row.find('.planned .index').first().text().trim();
					var actual = row.find('.expected .index').first().text().trim();

					if (statusText && statusText.indexOf('cancelled') >= 0) {

						if (notScraped(flyCode)) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: row.find('.destination .index').first().text().trim(),
								to: 'LEJ',
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'cancelled',
								type: 'arrival'
							});
						}
					};
					if (statusText && statusText.indexOf('arrived') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: row.find('.destination .index').first().text().trim(),
								to: 'LEJ',
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'delayed',
								scheduleTime: planned,
								actualTime: actual,
								delayedBy: delayedBy,
								type: 'arrival'
							});
						}
					}
				});
			} catch (e) {
				myLog(e);
			}
		} else {
			myLog('Error loading arrival page: ' + err);
		}

		scrapeDeparture();
	});
}

function scrapeDeparture () {
	request('https://www.leipzig-halle-airport.de/en/arrivals-and-departures-20.html?date='+(dd)+'.'+mm+'.'+yyyy+'&type=pd', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('.flights .main.row').each(function (idx, elm) {
					var row = $(elm);
					var flyCode = row.find('.flight-number .index').first().text().trim();
					var statusText = row.find('.status .index').first().text().trim();
					var planned = row.find('.planned .index').first().text().trim();
					var actual = row.find('.expected .index').first().text().trim();

					if (statusText && statusText.indexOf('cancelled') >= 0) {

						if (notScraped(flyCode)) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: 'LEJ',
								to: row.find('.destination .index').first().text().trim(),
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'cancelled',
								type: 'departure'
							});
						}
					};
					if (statusText && statusText.indexOf('departed') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: 'LEJ',
								to: row.find('.destination .index').first().text().trim(),
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'delayed',
								scheduleTime: planned,
								actualTime: actual,
								delayedBy: delayedBy,
								type: 'departure'
							});
						}
					}
				});
			} catch (e) {
				myLog(e);
			}
		} else {
			myLog('Error loading departure page: ' + err);
		}

		fs.writeFile(outFile, JSON.stringify(ScrapedFlights, null, 2), (err) => {
			if (err) throw err;
			myLog('Scraping done');
		});
	});
}

function notScraped(flyCode) {
	var ans = true;
	for (var i = ScrapedFlights.length - 1; i >= 0; i--) {
		if(ScrapedFlights[i].flyCode == flyCode) {
			ans = false;
		}
	}
	return ans;
}

function delayedTime (sT, aT) {
	if (!sT || !aT) return -1;
	var sH = sT.split(':')[0];
	var sM = sT.split(':')[1];
	var aH = aT.split(':')[0];
	var aM = aT.split(':')[1];
	var dl = (60*aH+1*aM)-(60*sH+1*sM);
	if (dl < 1320) return dl;
	return -1;
}

function myLog(str) {
	var d = new Date();
	console.log(d.toString() + ' LEJ: ' + str);
}

module.exports = scraping;
