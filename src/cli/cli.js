#!/usr/bin/env node

import { program } from 'commander';
import generateMetaData from '../actions/meta-data/meta-data.js';
import {
  runOneTimeUpload,
  startBackupProcess,
} from '../actions/uploads/minio.js';
import downloadAllPDFsParallely from '../actions/electoral-roll/parallel.js';
import { displayInsights, writeInsightsToFile } from '../insights/insights.js';
import {
  generatePDFNamesList,
  updateDownloadStatus,
  showStateMetrics,
  refreshStateDownloadStatus,
} from '../pdf-names.js';
import path from 'path';
import fs from 'fs';
import { parsePDFsToCSV } from '../csv-parser.js';

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
    console.log(`Downloading PDFs for state: ${JSON.stringify(stateCode)}`);
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

// New commands for PDF names functionality
program
  .command('generate-pdf-list')
  .description('Generate a list of PDF names with download status')
  .option(
    '-d, --dir <directory>',
    'Directory containing state folders',
    './states',
  )
  .action((options) => {
    console.log('Generating PDF names list...');
    const statesDir = path.resolve(options.dir);
    generatePDFNamesList(statesDir);
    console.log('PDF names list generation completed.');
  });

program
  .command('update-download-status')
  .description('Update download status for all PDFs in the list')
  .action(async () => {
    console.log('Updating download status for all PDFs...');
    const pdfNamesListPath = path.join(process.cwd(), 'pdfs.json');
    const pdfNamesList = JSON.parse(fs.readFileSync(pdfNamesListPath, 'utf8'));
    await updateDownloadStatus(pdfNamesList);
    console.log('Download status update completed.');
  });

program
  .command('show-state-metrics')
  .description('Show metrics for a specific state')
  .argument('<state>', 'State name')
  .action((state) => {
    showStateMetrics(state);
  });

program
  .command('refresh-state-status')
  .description('Refresh download status for a specific state')
  .argument('<state>', 'State name')
  .action(async (state) => {
    console.log(`Refreshing download status for ${state}...`);
    await refreshStateDownloadStatus(state);
    console.log('Refresh completed.');
  });

// New command for parsing PDFs
program
  .command('parse-pdfs')
  .description('Parse PDFs to CSV format')
  .action(async () => {
    console.log('Parsing PDFs to CSV...');
    await parsePDFsToCSV();
    console.log('PDF parsing completed.');
  });

program.parse(process.argv);
