import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import axiosInstance from '../../helper/axios.js';
import { EICURLs } from '../../constants/urls.js';
import { OUTPUT_DIR } from '../../constants/directories.js';
import { retryRequest } from '../../helper/http-utils.js';
import { colorLog } from '../../helper/chalk.js';
import { processInChunks } from '../../helper/parallel.js';

const concurrency = parseInt(process.env.METADATA_CONCURRENCY) || 5; // Adjust this value as needed

const failedRequests = [];

/**
 *
 * @param {*} payload
 * @returns
 */
async function getPartList(payload) {
  return retryRequest(async () => {
    const partRes = await axiosInstance.post(
      EICURLs.get_part_list.endpoint,
      payload,
    );
    return partRes.data.payload;
  }, failedRequests);
}

/**
 *
 * @param {*} payload
 * @returns
 */
async function getLanguages(payload) {
  return retryRequest(async () => {
    const languageRes = await axiosInstance.post(
      EICURLs.get_ac_languages.endpoint,
      payload,
    );
    return languageRes.data.payload;
  });
}

/**
 *
 * @param {*} stateCd
 * @param {*} districtCd
 * @returns
 */
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
      OUTPUT_DIR,
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

/**
 *
 * @param {*} stateCd
 * @returns
 */
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

/**
 *
 */
async function generateMetaData() {
  const stateRes = await retryRequest(async () =>
    axiosInstance.get(EICURLs.state.endpoint),
  );
  const statesArray = stateRes.data;

  const processState = async (state) => {
    const id = state.stateCd;
    state.districts = await getDistricts(id);

    // Create state file
    const statePath = path.join(OUTPUT_DIR, 'metadata', 'states', id);
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

export default generateMetaData;
