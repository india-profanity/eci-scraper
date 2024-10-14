# EIC Scraper

Scraper to scrape off electoral rolls off of the EIC website

## EIC Endpoints

GET: States
https://gateway-voters.eci.gov.in/api/v1/common/states/

GET CAPTCHA
https://gateway-voters.eci.gov.in/api/v1/captcha-service/generateCaptcha/EROLL

GET Districts
https://gateway-voters.eci.gov.in/api/v1/common/districts/{StateCd}

GET Constituencies (Dont know why)
https://gateway-voters.eci.gov.in/api/v1/common/constituencies?stateCode={StateCd}

GET Assembly Constituency (After selecting District)
https://gateway-voters.eci.gov.in/api/v1/common/acs/{districtCd}

POST: CHOOSE LANGUAGE
https://gateway-voters.eci.gov.in/api/v1/printing-publish/get-ac-languages
eg.
payload = {
"stateCd": "S07",
"districtCd": "S0702",
"acNumber": 4
}

POST: Get Part List
https://gateway-voters.eci.gov.in/api/v1/printing-publish/get-part-list
eg.
payload = {
"stateCd": "S07",
"districtCd": "S0702",
"acNumber": 4
}

POST: Download PDF
https://gateway-voters.eci.gov.in/api/v1/printing-publish/generate-published-geroll
eg
payload={
acNumber: 4,
captcha: "myk337",
captchaId: "AC5067A57D44BB9DF7E49DF34F295861",
districtCd: "S0702",
isSupplement: true, (OPTIONAL)
langCd: "HIN",
partNumber: 1,
stateCd: "S07"
}
