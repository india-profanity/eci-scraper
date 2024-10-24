// const fs = require('fs');
// const path = require('path');
// const axios = require('axios');

import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';

export async function parsePDFsToCSV() {
  const statesDir = path.join('output', 'metadata', 'states');

  // Get all state directories
  const stateDirs = fs.readdirSync(statesDir);

  for (const stateDir of stateDirs) {
    if (stateDir == '.DS_Store') continue;
    const pdfJsonPath = path.join(statesDir, stateDir, 'pdfs.json');

    // Check if pdfs.json exists for the state
    if (fs.existsSync(pdfJsonPath)) {
      const pdfData = JSON.parse(fs.readFileSync(pdfJsonPath, 'utf-8'));

      // Process each PDF file in the JSON
      for (const pdfFile of pdfData) {
        await makeAPICall(pdfFile.filename);
      }
    }
  }
}

async function makeAPICall(pdfFilename) {
  try {
    const response = await axios.post(process.env.PDF_PARSER_URL, {
      params: {
        pdf_path: pdfFilename,
      },
    });

    // Process the API response here
    console.log(`Processed ${pdfFilename}: ${response.data}`);
  } catch (error) {
    console.error(`Error processing ${pdfFilename}: ${error.message}`);
  }
}

// // Run the parser
// parsePDFsToCSV();
