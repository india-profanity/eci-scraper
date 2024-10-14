import fs from 'fs';
import path from 'path';
import axiosInstance from '../helper/axios.js';
import { EICURLs } from '../constants/urls.js';

export async function getStateMetadata(stateCode) {
  const statePath = path.join('Output', 'states', stateCode, 'state.json');

  if (fs.existsSync(statePath)) {
    console.log(`Metadata for state ${stateCode} already exists.`);
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  const stateRes = await axiosInstance.get(EICURLs.state.endpoint);
  const state = stateRes.data.find((s) => s.stateCd === stateCode);

  if (!state) {
    throw new Error(`State with code ${stateCode} not found.`);
  }

  // Fetch districts and constituencies (simplified for brevity)
  state.districts = await getDistricts(stateCode);

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  return state;
}

export async function downloadPDFs(stateCode) {
  const statePath = path.join('Output', 'states', stateCode, 'state.json');

  if (!fs.existsSync(statePath)) {
    throw new Error(
      `Metadata for state ${stateCode} not found. Please run get-state-metadata first.`,
    );
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  for (const district of state.districts) {
    for (const constituency of district.acs) {
      for (const part of constituency.parts) {
        // Here you would implement the logic to download the PDF
        // This is a placeholder for the actual download logic
        console.log(
          `Downloading PDF for part ${part.partNo} of constituency ${constituency.asmblyNo}`,
        );
        // await downloadPDF(part.pdfLink);
      }
    }
  }
}

// Helper functions (getDistricts, getConstituencies, etc.) should be implemented here
// They can be similar to those in metadata.js, but optimized for single state fetching
