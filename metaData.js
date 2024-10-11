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

async function getPartList(payload){
    const partRes = await axiosInstance(postURLs.get_part_list, payload)
    return partRes.data.payload
}

async function getLanguages(payload){
    const languageRes = await axiosInstance(postURLs.get_ac_languages, payload)
    return languageRes.data.payload
}

async function getConstituencies(districtCd){
    const constituencyRes = await axiosInstance(getURLs.constituency(districtCd))

    const tempConstituency = {}
    const constituencyArray = constituencyRes.data

    constituencyArray.forEach(async (constituency) => {
        // Using acNumber as KEY
        const id = constituency.asmblyNo
        tempConstituency[`${id}`] = constituency

        // Payload for part_list and languages
        const payload = {
            stateCd: constituency.stateCd,
            districtCd: constituency.districtCd,
            acNumber: constituency.asmblyNo
        }

        // Function call to take out parts and append with key 'parts'
        tempConstituency[`${id}`].parts = await getPartList(payload)

        // Function call to take out languages and append with key 'languages'
        tempConstituency[`${id}`].languages = await getLanguages(payload)
    })

    return tempConstituency;
}

async function getDistricts(stateCd){
    const districtRes = await axiosInstance(getURLs.districts(stateCd))

    const tempDistrict = {}
    const districtArray = districtRes.data

    districtArray.forEach(async (district) => {
        // Using districtCd as KEY
        const id = district.districtCd
        tempDistrict[`${id}`] = district

        // Function to takeout Constituencies and append with the key 'acs' //assembly constituency
        tempDistrict[`${id}`].acs = await getConstituencies(id)
    })

    return tempDistrict;
}

const metaData = {}

const stateRes = await axiosInstance.get(getURLs.state)
// console.log(stateRes.data);

const statesArray = stateRes.data;

statesArray.forEach(async (state) => {
    // Using stateCd as KEY
    const id = state.stateCd;
    metaData[`${id}`] = state;

    // Function to takeout Districts and append with key 'districts' for each State
    metaData[`${id}`].districts = await getDistricts(id)
})

try {
    fs.writeFileSync("./Output/metaData.json", JSON.stringify(metaData))
    console.log("File Successfully Created")
} catch (error) {
    console.error("Error writing file:", error)
}

export default metaData