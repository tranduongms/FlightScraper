var HHNScraper = require('./HHN_Scraper.js');
var LEJScraper = require('./LEJ_Scraper.js');
var DTMScraper = require('./DTM_Scraper.js');
var NRNScraper = require('./NRN_Scraper.js');
var DRSScraper = require('./DRS_Scraper.js');

function scraping() {
	HHNScraper();
	LEJScraper();
	DTMScraper();
	NRNScraper();
	DRSScraper();
}

scraping();
setInterval(scraping, 900000);