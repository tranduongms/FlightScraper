// DRS Airport

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
		outFile = '/var/www/html/json/'+yyyy+mm+dd+'.DRS.json';
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
	request('http://www.dresden-airport.de/passengers-and-visitors/destinations-and-timetable/timetable.html?type=arrival&newLanguage=en', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('table.flugtafel tr.tdBorder').each(function (idx, elm) {
					var tds = $(elm).find('td');
					var flyCode = tds.eq(1).text().trim();
					var statusText = tds.eq(7).text().trim();
					var planned = tds.eq(4).text().trim();
					var actual = tds.eq(5).text().trim();

					if (statusText && statusText.indexOf('cancelled') >= 0) {

						if (notScraped(flyCode)) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: tds.eq(2).text().trim(),
								to: 'DRS',
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'cancelled',
								type: 'arrival'
							});
						}
					};
					if (statusText && statusText.indexOf('landed') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: tds.eq(2).text().trim(),
								to: 'DRS',
								airline: airline_iata(flyCode.split(' ')[0]),
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
	request('http://www.dresden-airport.de/passengers-and-visitors/destinations-and-timetable/timetable.html?type=departure&newLanguage=en', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('table.flugtafel tr.tdBorder').each(function (idx, elm) {
					var tds = $(elm).find('td');
					var flyCode = tds.eq(1).text().trim();
					var statusText = tds.eq(8).text().trim();
					var planned = tds.eq(4).text().trim();
					var actual = tds.eq(5).text().trim();

					if (statusText && statusText.indexOf('cancelled') >= 0) {

						if (notScraped(flyCode)) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: 'DRS',
								to: tds.eq(2).text().trim(),
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'cancelled',
								type: 'departure'
							});
						}
					};
					if (statusText && statusText.indexOf('airborne') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: 'DRS',
								to: tds.eq(2).text().trim(),
								airline: airline_iata(flyCode.split(' ')[0]),
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
	console.log(d.toString() + ' DRS: ' + str);
}

module.exports = scraping;
