import fs from 'fs';
import path from 'path';
import axiosInstance from './helper/axios.js';
import { EICURLs } from './constants/urls.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry wrapper to handle retries on 500 errors
async function retryRequest(fn, retries = 3, delayTime = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response && error.response.status === 500) {
      console.log('Retrying due to 500 error...');
      await delay(delayTime);
      return retryRequest(fn, retries - 1, delayTime * 2); // Exponential backoff
    } else {
      throw error;
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

async function getConstituencies(stateCd, districtCd) {
  const constituencyRes = await retryRequest(async () =>
    axiosInstance.get(EICURLs.acs.endpoint.replace(':districtCd', districtCd)),
  );

  const constituencyArray = constituencyRes.data;

  for (const constituency of constituencyArray) {
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

    console.log(`Constituency ${id} Done`);
    await delay(1000);
  }

  return constituencyArray;
}

async function getDistricts(stateCd) {
  const districtRes = await retryRequest(async () =>
    axiosInstance.get(EICURLs.districts.endpoint.replace(':stateCd', stateCd)),
  );

  const districtArray = districtRes.data;

  for (const district of districtArray) {
    const id = district.districtCd;
    district.acs = await getConstituencies(stateCd, id);

    console.log(`## District ${id} Done`);
    await delay(1000);
  }

  return districtArray;
}

async function generateMetaData() {
  const stateRes = await retryRequest(async () =>
    axiosInstance.get(EICURLs.state.endpoint),
  );
  const statesArray = stateRes.data;

  for (const state of statesArray) {
    const id = state.stateCd;
    state.districts = await getDistricts(id);

    // Create state file
    const statePath = path.join('output', 'metadata', 'states', id);
    fs.mkdirSync(statePath, { recursive: true });
    fs.writeFileSync(
      path.join(statePath, 'state.json'),
      JSON.stringify(state, null, 2),
    );

    console.log(`## State ${id} Done`);
    await delay(1000);
  }

  console.log('All data generated successfully');
}

generateMetaData();

export default generateMetaData;
