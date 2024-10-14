import fs from 'fs';
import path from 'path';
import axios from 'axios';

const statesDir = path.join('output', 'metadata', 'states'); // Path to the states directory


// Download and solve captchas, then download PDFs
async function downloadPDF(partPayload) {
  const captchaURL = 'http://localhost:8000/generate_and_solve_captchas';
  const downloadPDFURL = 'https://gateway-voters.eci.gov.in/api/v1/printing-publish/generate-published-geroll';
  
  const maxCaptchaTries = 3; // Maximum tries for getting new captchas

  let successfulDownload = false;
  
  for (let attempt = 1; attempt <= maxCaptchaTries; attempt++) {
    console.log(`Attempt ${attempt} to get captchas for part ${partPayload.partNumber}`);

    // Call captcha generation API to get 3 captchas
    const captchaRes = await axios.post(captchaURL, { count: 3 });
    const captchas = captchaRes.data.captchas; // Array of captcha objects
    
    for (const captcha of captchas) {
      const payloadWithCaptcha = {
        ...partPayload, // Spread the original partPayload
        captcha: captcha.value, // Use the captcha value
        captchaId: captcha.id,  // Use the captcha ID
      };

      try {
        // First call without isSupplement
        await downloadAndSavePDF(payloadWithCaptcha, downloadPDFURL);

        // Second call with isSupplement: true
        const payloadWithSupplement = { ...payloadWithCaptcha, isSupplement: true };
        await downloadAndSavePDF(payloadWithSupplement, downloadPDFURL);

        successfulDownload = true;
        break; // Exit the loop if successful
      } catch (error) {
        console.log(`Captcha ${captcha.value} failed. Trying the next one.`);
      }
    }

    if (successfulDownload) {
      break; // Exit the retry loop if download succeeded
    }

    console.log(`All captchas in attempt ${attempt} failed. Retrying with new captchas...`);
  }

  if (!successfulDownload) {
    console.error(`All captcha attempts failed after ${maxCaptchaTries} tries for part ${partPayload.partNumber}`);
  }
}

// Helper function to download and save PDF
async function downloadAndSavePDF(payload, url) {
  const response = await axios.post(url, payload);
  const base64File = response.data.file; // Base64-encoded file content

  if (!base64File) {
    throw new Error('No file found in the response');
  }

  // Decode base64 and save as PDF
  const pdfBuffer = Buffer.from(base64File, 'base64');

  // Define file name using the payload values
  const fileName = `${payload.stateCd}_district${payload.districtCd}_ac${payload.acNumber}_part${payload.partNumber}${payload.isSupplement ? '_supplement' : ''}.pdf`;
  const pdfDirectory = path.join('output', 'pdfs', payload.stateCd);

  await fs.mkdir(pdfDirectory, { recursive: true }); // Create directory if not exists
  await fs.writeFile(path.join(pdfDirectory, fileName), pdfBuffer); // Save PDF file

  console.log(`PDF saved: ${fileName}`);
}

// Async function that processes the parts from each state.json
async function processStateData(stateData) {
  const stateName = stateData.stateName;
  const districts = stateData.districts; // Array of districts
  const allConstituencies = districts.flatMap(d => d.acs); // Array of all constituencies
  const allParts = allConstituencies.flatMap(c => c.parts); // Array of all parts
  console.log(`Processing state: ${stateName}`);
  
  // DOWNLOAD PDF using allParts Array
  for (const part of allParts) {
    try {
      await downloadPDF(part); // Call the function to download PDFs
    } catch (error) {
      console.error(`Failed to download for part ${part.partNumber}:`, error.message);
    }
  }

  console.log(`Finished processing state: ${stateName}`);
}

// Function to loop through all state folders
async function processStates() {
  try {
    // Read the contents of the states directory
    const stateFolders = fs.readdirSync(statesDir);

    for (const folder of stateFolders) {
      const stateJsonPath = path.join(statesDir, folder, 'state.json');

      // Check if state.json exists in the folder
      try {
        const stateJsonContent = fs.readFileSync(stateJsonPath, 'utf-8');
        const stateData = JSON.parse(stateJsonContent); // Parse JSON content

        // Pass the stateData to your async function
        await processStateData(stateData);

      } catch (err) {
        console.error(`Error processing ${stateJsonPath}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error reading states directory:', err.message);
  }
}

// Run the script
processStates();