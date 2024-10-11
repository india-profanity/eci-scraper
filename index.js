// IMPORT STATEMENTS
import axios from "axios";
import * as fs from 'fs';
import getAndSolveCaptcha from "./helper/getAndSolveCaptcha.js";

// // GET CAPTCHA TEXT AND ID
// const { captchaText, captchaId } = await getAndSolveCaptcha();

// GET PART LIST

let acData = {
    stateCd: "S07",
    districtCd: "S0702",
    acNumber: 4 
}

let partList = await axios.post(
    "https://gateway-voters.eci.gov.in/api/v1/printing-publish/get-part-list",
    acData
)

partList = partList.data.payload

partList.forEach((part, index) => {
    
});