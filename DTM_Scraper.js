// DTM Airport

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
		outFile = '/var/www/html/json/'+yyyy+mm+dd+'.DTM.json';
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
	request('https://www.dortmund-airport.com/arrivals', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('.timetable-arrivals li .row').each(function (idx, elm) {
					var row = $(elm);
					var flyCode = row.find('.flightno').first().text().slice(15).trim();
					var statusText = row.find('.status').first().text().slice(8).trim();
					var planned = row.find('.scheduled').first().text().slice(15).trim();
					var actual = row.find('.expected').first().text().slice(16).trim();

					if (statusText && statusText.indexOf('Cancelled') >= 0) {

						if (notScraped(flyCode)) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: row.find('.destination').first().text().trim(),
								to: 'DTM',
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'cancelled',
								type: 'arrival'
							});
						}
					};
					if (statusText && statusText.indexOf('Landed') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: row.find('.destination').first().text().trim(),
								to: 'DTM',
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
	request('https://www.dortmund-airport.com/departures', function (err, res, body) {
		if (!err && res.statusCode == 200) {
			try {
				var $ = cheerio.load(body);
				$('.timetable-arrivals li .row').each(function (idx, elm) {
					var row = $(elm);
					var flyCode = row.find('.flightno').first().text().slice(15).trim();
					var statusText = row.find('.status').first().text().slice(8).trim();
					var planned = row.find('.scheduled').first().text().slice(15).trim();
					var actual = row.find('.expected').first().text().slice(16).trim();

					if (statusText && statusText.indexOf('Cancelled') >= 0) {

						if (notScraped(flyCode)) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: 'DTM',
								to: row.find('.destination').first().text().trim(),
								airline: airline_iata(flyCode.split(' ')[0]),
								status: 'cancelled',
								type: 'departure'
							});
						}
					};
					if (statusText && statusText.indexOf('Departed') >= 0) {
						var delayedBy = delayedTime(planned, actual);

						if (notScraped(flyCode) && delayedBy >= MinTimeAsDelayed) {
							ScrapedFlights.push({
								flyCode: flyCode,
								from: 'DTM',
								to: row.find('.destination').first().text().trim(),
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
	console.log(d.toString() + ' DTM: ' + str);
}

module.exports = scraping;
