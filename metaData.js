import fs from 'fs';
import axiosInstance from "./helper/axiosInstance.js";

const getURLs = {
    state: '/common/states',
    districts: (stateCd) => `/common/districts/${stateCd}`,
    constituency: (districtCd) => `/common/acs/${districtCd}`
}

const postURLs = {
    get_part_list: '/printing-publish/get-part-list',
    get_ac_languages: '/printing-publish/get-ac-languages'
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry wrapper to handle retries on 500 errors
async function retryRequest(fn, retries = 3, delayTime = 1000) {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0 && error.response && error.response.status === 500) {
            console.log("Retrying due to 500 error...");
            await delay(delayTime);
            return retryRequest(fn, retries - 1, delayTime * 2); // Exponential backoff
        } else {
            throw error;
        }
    }
}

async function getPartList(payload) {
    return retryRequest(async () => {
        const partRes = await axiosInstance.post(postURLs.get_part_list, payload);
        return partRes.data.payload;
    });
}

async function getLanguages(payload) {
    return retryRequest(async () => {
        const languageRes = await axiosInstance.post(postURLs.get_ac_languages, payload);
        return languageRes.data.payload;
    });
}

async function getConstituencies(districtCd) {
    const constituencyRes = await retryRequest(async () => axiosInstance.get(getURLs.constituency(districtCd)));

    const tempConstituency = {};
    const constituencyArray = constituencyRes.data;

    for (const constituency of constituencyArray) {
        const id = constituency.asmblyNo;
        tempConstituency[`${id}`] = constituency;

        const payload = {
            stateCd: constituency.stateCd,
            districtCd: constituency.districtCd,
            acNumber: constituency.asmblyNo
        };

        tempConstituency[`${id}`].parts = await getPartList(payload);
        tempConstituency[`${id}`].languages = await getLanguages(payload);

        // Adding delay of 1 second (1000 ms)
        console.log(`Constituency ${id} Done`);
        await delay(1000);
    }

    return tempConstituency;
}

async function getDistricts(stateCd) {
    const districtRes = await retryRequest(async () => axiosInstance.get(getURLs.districts(stateCd)));

    const tempDistrict = {};
    const districtArray = districtRes.data;

    for (const district of districtArray) {
        const id = district.districtCd;
        tempDistrict[`${id}`] = district;

        tempDistrict[`${id}`].acs = await getConstituencies(id);

        console.log(`## District ${id} Done`);
        await delay(1000);
    }

    return tempDistrict;
}

async function generateMetaData() {
    const metaData = {};
    const stateRes = await retryRequest(async () => axiosInstance.get(getURLs.state));
    const statesArray = stateRes.data;

    for (const state of statesArray) {
        const id = state.stateCd;
        metaData[`${id}`] = state;

        metaData[`${id}`].districts = await getDistricts(id);

        console.log(`## State ${id} Done`);
        await delay(1000);
    }

    try {
        fs.writeFileSync("./Output/metaData.json", JSON.stringify(metaData));
        console.log("File Successfully Created");
    } catch (error) {
        console.error("Error writing file:", error);
    }
}

generateMetaData();

export default generateMetaData;
