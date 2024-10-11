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

async function getPartList(payload) {
    const partRes = await axiosInstance.post(postURLs.get_part_list, payload);
    return partRes.data.payload;
}

async function getLanguages(payload) {
    const languageRes = await axiosInstance.post(postURLs.get_ac_languages, payload);
    return languageRes.data.payload;
}

async function getConstituencies(districtCd) {
    const constituencyRes = await axiosInstance.get(getURLs.constituency(districtCd));

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
    }

    return tempConstituency;
}

async function getDistricts(stateCd) {
    const districtRes = await axiosInstance.get(getURLs.districts(stateCd));

    const tempDistrict = {};
    const districtArray = districtRes.data;

    for (const district of districtArray) {
        const id = district.districtCd;
        tempDistrict[`${id}`] = district;

        tempDistrict[`${id}`].acs = await getConstituencies(id);
    }

    return tempDistrict;
}

async function generateMetaData() {
    const metaData = {};
    const stateRes = await axiosInstance.get(getURLs.state);
    const statesArray = stateRes.data;

    for (const state of statesArray) {
        const id = state.stateCd;
        metaData[`${id}`] = state;

        metaData[`${id}`].districts = await getDistricts(id);
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
