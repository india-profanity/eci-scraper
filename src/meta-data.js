import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import axiosInstance from './helper/axios.js';
import { EICURLs } from './constants/urls.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const failedRequests = [];
// Retry wrapper to handle retries on 500 errors
async function retryRequest(fn, retries = 3, delayTime = 100) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response && error.response.status === 500) {
      colorLog('Retrying due to 500 error...', 'yellow');
      await delay(delayTime);
      return retryRequest(fn, retries - 1, delayTime * 2); // Exponential backoff
    } else {
      failedRequests.push({ fn, error });
      colorLog(`Request failed: ${error.message}`, 'red');
      return null; // or a default value, depending on your needs
    }
  }
}

async function getPartList(payload) {
  return retryRequest(async () => {
    const partRes = await axiosInstance.post(
      EICURLs.get_part_list.endpoint,
      payload,
    );
    return partRes.data.payload;
  });
}

async function getLanguages(payload) {
  return retryRequest(async () => {
    const languageRes = await axiosInstance.post(
      EICURLs.get_ac_languages.endpoint,
      payload,
    );
    return languageRes.data.payload;
  });
}

// Add colorful logging function
function colorLog(message, color = 'white') {
  console.log(chalk[color](message));
}

// Add a utility function to process items in chunks
async function processInChunks(items, chunkSize, processFunction) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const results = [];
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(processFunction));
    results.push(...chunkResults);
  }
  return results;
}

async function getConstituencies(stateCd, districtCd) {
  const constituencyRes = await retryRequest(async () =>
    axiosInstance.get(EICURLs.acs.endpoint.replace(':districtCd', districtCd)),
  );

  const constituencyArray = constituencyRes.data;

  const processConstituency = async (constituency) => {
    const id = constituency.asmblyNo;
    const payload = {
      stateCd: constituency.stateCd,
      districtCd: constituency.districtCd,
      acNumber: constituency.asmblyNo,
    };

    constituency.parts = await getPartList(payload);
    constituency.languages = await getLanguages(payload);

    // Create constituency file
    const constituencyPath = path.join(
      'output',
      'metadata',
      'states',
      stateCd,
      'districts',
      districtCd,
    );
    fs.mkdirSync(constituencyPath, { recursive: true });
    fs.writeFileSync(
      path.join(constituencyPath, `constituency_${id}.json`),
      JSON.stringify(constituency, null, 2),
    );

    colorLog(`Constituency ${id} Done`, 'green');
    return constituency;
  };

  return processInChunks(constituencyArray, concurrency, processConstituency);
}

async function getDistricts(stateCd) {
  const districtRes = await retryRequest(async () =>
    axiosInstance.get(EICURLs.districts.endpoint.replace(':stateCd', stateCd)),
  );

  const districtArray = districtRes.data;

  const processDistrict = async (district) => {
    const id = district.districtCd;
    district.acs = await getConstituencies(stateCd, id);
    colorLog(`## District ${id} Done`, 'blue');
    return district;
  };

  return processInChunks(districtArray, concurrency, processDistrict);
}

async function generateMetaData() {
  const stateRes = await retryRequest(async () =>
    axiosInstance.get(EICURLs.state.endpoint),
  );
  const statesArray = stateRes.data;

  const processState = async (state) => {
    const id = state.stateCd;
    state.districts = await getDistricts(id);

    // Create state file
    const statePath = path.join('output', 'metadata', 'states', id);
    fs.mkdirSync(statePath, { recursive: true });
    fs.writeFileSync(
      path.join(statePath, 'state.json'),
      JSON.stringify(state, null, 2),
    );

    colorLog(`## State ${id} Done`, 'magenta');
    return state;
  };

  await processInChunks(statesArray, concurrency, processState);

  colorLog('All data generated successfully', 'yellow');
}

// Set the concurrency level
const concurrency = 5; // Adjust this value as needed

generateMetaData();

export default generateMetaData;
