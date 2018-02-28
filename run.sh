#!/bin/bash

forever stopall
rm *.out

forever -o collecting.out start collector.js
forever -o CGN.out start CGN_Scraper.js
forever -o DUS.out start DUS_Scraper.js
forever -o FRA.out start FRA_Scraper.js
forever -o MUC.out start MUC_Scraper.js
forever -o SXF.out start SXF_Scraper.js
forever -o TXL.out start TXL_Scraper.js
forever -o HAM.out start HAM_Scraper.js
forever -o STR.out start STR_Scraper.js
forever -o HAJ.out start HAJ_Scraper.js
forever -o NUE.out start NUE_Scraper.js
forever -o BRE.out start BRE_Scraper.js
forever -o Scraper.out start Scraper.js