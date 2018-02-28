// HHN Airport

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
		outFile = '/var/www/html/json/'+yyyy+mm+dd+'.HHN.json';
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
	request('http://www.hahn-airport.de/default.aspx?menu=arrivals&cc=en', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('.flugTabelleKomplett').first().find('tr').filter(function(idx, elm) {
					return $(elm).find('th').length == 0;
				}).each(function (idx, elm) {
					var tds = $(elm).find('td');
					var flyCode = tds.first().text().trim();
					var statusText = tds.eq(5).text();
					var planned = tds.eq(2).text().trim();
					var actual = tds.eq(3).text().trim();

					if (statusText && statusText.indexOf('arrived') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: tds.eq(1).text().trim(),
								to: 'HHN',
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
	request('http://www.hahn-airport.de/default.aspx?menu=departures&cc=en', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('.flugTabelleKomplett').first().find('tr').filter(function(idx, elm) {
					return $(elm).find('th').length == 0;
				}).each(function (idx, elm) {
					var tds = $(elm).find('td');
					var flyCode = tds.first().text().trim();
					var statusText = tds.eq(4).text();
					var planned = tds.eq(2).text().trim();
					var actual = tds.eq(3).text().trim();

					if (statusText && statusText.indexOf('departed') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: 'HHN',
								to: tds.eq(1).text().trim(),
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
	console.log(d.toString() + ' HHN: ' + str);
}

module.exports = scraping;
