import axios from 'axios';
import fs from 'fs';

async function downloadVoterList() {
  for (let i = 1; i <= 10; i++) {
    // API endpoint and payload
    const url = 'https://gateway-voters.eci.gov.in/api/v1/printing-publish/generate-published-geroll';
    const payload = {
      acNumber: 4,
      captcha: "uo5pfi",  // Replace with your actual captcha
      captchaId: "4F991C8F59D5463E33067AB6AF7F1216",
      districtCd: "S0702",
      langCd: "HIN",
      partNumber: i,
      stateCd: "S07"
    };

    try {
      // Wait for the POST request to finish
      const response = await axios.post(url, payload);

      // Check if response contains base64 data
      const base64Data = response.data.file;
      if (base64Data) {
        // Define file name and path
        const filePath = `./Output/voter-list_${payload.partNumber}.pdf`;

        // Decode base64 and save the file
        const fileBuffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, fileBuffer);

        console.log(`File saved successfully to ${filePath}`);
      } else {
        console.error('No file data found in the response.');
      }

    } catch (error) {
      console.error(`Error during the request for part ${i}:`, error.message);
    }
  }
}

// Run the function
downloadVoterList();
