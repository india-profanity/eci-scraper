#!/usr/bin/env node

import { program } from 'commander';
import generateMetaData from '../metadata.js';
import { getStateMetadata, downloadPDFs } from './actions.js';

program.version('1.0.0').description('EIC Scraper CLI');

program
  .command('scrape-metadata')
  .description('Scrape metadata for all states')
  .action(async () => {
    console.log('Scraping metadata for all states...');
    await generateMetaData();
    console.log('Metadata scraping completed.');
  });

program
  .command('get-state-metadata <stateCode>')
  .description('Get metadata for a specific state')
  .action(async (stateCode) => {
    console.log(`Fetching metadata for state: ${stateCode}`);
    await getStateMetadata(stateCode);
    console.log('State metadata fetching completed.');
  });

program
  .command('download-pdfs <stateCode>')
  .description('Download PDFs for a specific state')
  .action(async (stateCode) => {
    console.log(`Downloading PDFs for state: ${stateCode}`);
    await downloadPDFs(stateCode);
    console.log('PDF downloading completed.');
  });

program.parse(process.argv);
