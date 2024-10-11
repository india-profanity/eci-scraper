/**
 * @file testReq.js
 * @description This script is intended to test various endpoints to ensure they are working properly.
 * It uses axiosInstance to make HTTP requests to both GET and POST endpoints and logs the responses.
 * 
 * The script includes:
 * - Definitions of URL endpoints for states, districts, and constituencies.
 * - Functions to get part lists and languages using POST requests.
 * - Test cases for each endpoint to verify their functionality.
 * 
 * @module testReq
 * 
 * @requires axiosInstance - Custom axios instance for making HTTP requests.
 * 
 * @constant {Object} getURLs - Contains URL endpoints for GET requests.
 * @property {string} state - Endpoint for fetching states.
 * @property {function} districts - Function to get endpoint for fetching districts based on state code.
 * @property {function} constituency - Function to get endpoint for fetching constituencies based on district code.
 * 
 * @constant {Object} postURLs - Contains URL endpoints for POST requests.
 * @property {string} get_part_list - Endpoint for fetching part list.
 * @property {string} get_ac_languages - Endpoint for fetching languages.
 * 
 * @function getPartList - Fetches part list using a POST request.
 * @param {Object} payload - Payload for the POST request.
 * @returns {Promise<Object>} - Response data payload.
 * 
 * @function getLanguages - Fetches languages using a POST request.
 * @param {Object} payload - Payload for the POST request.
 * @returns {Promise<Object>} - Response data payload.
 */


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

async function getPartList(payload) {
    const partRes = await axiosInstance.post(postURLs.get_part_list, payload);
    return partRes.data.payload;
}

async function getLanguages(payload) {
    const languageRes = await axiosInstance.post(postURLs.get_ac_languages, payload);
    return languageRes.data.payload;
}

// Testing 'state' endpoint
try {
    const StateRes = await axiosInstance.get(getURLs.state);
    console.log(StateRes.data);
} catch (error) {
    console.error(error.message);
}

// Testing 'districts' endpoint
try {
    const DistrictRes = await axiosInstance.get(getURLs.districts('S01'));
    console.log(DistrictRes.data);
} catch (error) {
    console.error(error.message);
}

// Testing 'constituency' endpoint
try {
    const ConstituencyRes = await axiosInstance.get(getURLs.constituency('S0104'));
    console.log(ConstituencyRes.data);
} catch (error) {
    console.error(error.message);
}

// Testing 'get_part_list' endpoint
const payload = {
    stateCd: 'S01',
    districtCd: 'S0104',
    acNumber: 28
}

try {
    const PartList = await getPartList(payload);
    console.log(PartList);
} catch (error) {
    console.error(error.message);
}

// Testing 'get_ac_languages' endpoint
try {
    const Languages = await getLanguages(payload);
    console.log(Languages);
} catch (error) {
    console.error(error.message);
}