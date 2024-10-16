#!/usr/bin/env node

import { program } from 'commander';
import generateMetaData from '../actions/meta-data/meta-data.js';
import {
  runOneTimeUpload,
  startBackupProcess,
} from '../actions/uploads/minio.js';
import downloadAllPDFsParallely from '../actions/electoral-roll/parallel.js';
import { displayInsights, writeInsightsToFile } from '../insights/insights.js';

program.version('1.0.0').description('ECI Scraper CLI');

/// Scraping related commands
program
  .command('scrape-metadata')
  .description('Scrape metadata for all states')
  .action(async () => {
    console.log('Scraping metadata for all states...');
    await generateMetaData();
    console.log('Metadata scraping completed.');
  });

program
  .command('download-pdfs')
  .description('Download PDFs for all states')
  .action(async (stateCode) => {
    console.log(`Downloading PDFs for state: ${stateCode}`);
    await downloadAllPDFsParallely();
    console.log('PDF downloading completed.');
  });

/// MinIO related commands
program
  .command('backup')
  .description('Start periodic backup of the output folder')
  .action(() => {
    console.log('Starting periodic backup...');
    startBackupProcess();
  });

program
  .command('upload')
  .description('Perform a one-time upload of the output folder')
  .action(async () => {
    console.log('Performing one-time upload...');
    await runOneTimeUpload();
    console.log('Upload completed.');
  });

// New command for generating insights
program
  .command('generate-insights')
  .description('Generate insights from the scraped data')
  .action(() => {
    console.log('Generating insights...');
    writeInsightsToFile();
    console.log('Insights generation completed.');
  });

// Updated command for showing insights
program
  .command('show-insights')
  .description('Show insights from the scraped data')
  .option('-s, --state <state>', 'Show insights for a specific state')
  .action((options) => {
    displayInsights(options);
  });

program.parse(process.argv);
