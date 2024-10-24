import fs from 'fs';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';

const statesDir = path.join('output', 'metadata', 'states'); // Path to the states directory
const concurrency = 10;

// Download and solve captchas, then download PDFs
async function downloadPDF(partPayload) {
  const captchaURL = 'http://localhost:8000/generate_and_solve_captchas';
  const downloadPDFURL =
    'https://gateway-voters.eci.gov.in/api/v1/printing-publish/generate-published-geroll';

  let successfulDownload = false;

  // Call captcha generation API to get 3 captchas
  const captchaRes = await axios.post(captchaURL, { count: 10 });
  const captchas = captchaRes.data.captchas; // Array of captcha objects

  for (const captcha of captchas) {
    try {
      const payloadWithCaptcha = {
        ...partPayload, // Spread the original partPayload
        captcha: captcha.value, // Use the captcha value
        captchaId: captcha.id, // Use the captcha ID
      };
      // First call without isSupplement
      await downloadAndSavePDF(payloadWithCaptcha, downloadPDFURL);
      // TODO: Add support for other parts
      return; // Exit the loop if successful
    } catch (error) {
      console.log(
        `Captcha ${captcha.value} failed with error: ${error}. Trying the next one.`,
      );
    }
  }
}

// Helper function to download and save PDF
async function downloadAndSavePDF(payload, url) {
  const response = await axios.post(url, payload);
  const base64File = response.data.file; // Base64-encoded file content

  if (!base64File) {
    throw new Error('No file found in the response');
  }
  // Define file name using the payload values
  const fileName = `${payload.stateCd}_district${payload.districtCd}_ac${
    payload.acNumber
  }_part${payload.partNumber}${
    payload.isSupplement ? '_supplement' : ''
  }_${Date.now()}.pdf`;
  const pdfDirectory = path.join(
    'output',
    'metadata',
    'states',
    payload.stateCd,
    'pdfs',
  );
  await decodeAndSavePDF(base64File, fileName, pdfDirectory);

  console.log(`PDF saved: ${fileName}`);
}

// Async function that processes the parts from each state.json
async function processStateData(stateData) {
  const stateName = stateData.stateName;
  const districts = stateData.districts; // Array of districts
  const allConstituencies = districts.flatMap((d) => d.acs); // Array of all constituencies
  const allParts = allConstituencies.flatMap((c) => c.parts); // Array of all parts
  // write allParts to a json file
  fs.writeFileSync(
    path.join('output', 'metadata', 'states', stateData.stateCd, 'parts.json'),
    JSON.stringify(allParts, null, 2),
  );
  console.log(`Processing state: ${stateName}`);

  // DOWNLOAD PDF using allParts Array
  for (let i = 0; i < allParts.length; i += concurrency) {
    const chunk = allParts.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (part) => {
        try {
          console.log(chalk.yellow(`Processing part: ${part.partNumber}`));
          const languageRes = await axios.post(
            'https://gateway-voters.eci.gov.in/api/v1/printing-publish/get-ac-languages',
            {
              stateCd: part.stateCd,
              districtCd: part.districtCd,
              acNumber: part.acNumber,
            },
          );

          const isHindiPresent = languageRes.data.payload.find(
            (l) => l.languagePneumonicL1 === 'HIN',
          );
          const isEnglishPresent = languageRes.data.payload.find(
            (l) => l.languagePneumonicL1 === 'ENG',
          );
          const langCd = isHindiPresent
            ? 'HIN'
            : isEnglishPresent
            ? 'ENG'
            : languageRes.data.payload[0].languagePneumonicL1;

          await downloadPDF({ ...part, langCd });
        } catch (error) {
          console.error(
            chalk.red(
              `Failed to download for part ${part.partNumber}:`,
              error.message,
            ),
          );
        }
      }),
    );
  }

  console.log(`Finished processing state: ${stateName}`);
}

// Function to loop through all state folders
async function processStates() {
  try {
    // Read the contents of the states directory
    const stateFolders = fs.readdirSync(statesDir);

    for (const folder of stateFolders) {
      if (folder == '.DS_Store') continue;
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

async function decodeAndSavePDF(base64String, fileName, outputDirectory) {
  try {
    // Validate inputs
    if (typeof base64String !== 'string' || base64String.trim() === '') {
      throw new Error('Invalid base64String');
    }
    if (typeof fileName !== 'string' || fileName.trim() === '') {
      throw new Error('Invalid fileName');
    }
    if (typeof outputDirectory !== 'string' || outputDirectory.trim() === '') {
      throw new Error('Invalid outputDirectory');
    }

    // Sanitize the file name to prevent directory traversal
    const sanitizedFileName = path.basename(fileName);

    // Resolve the absolute path of the output directory
    const absoluteOutputDir = path.resolve(outputDirectory);

    // Check if the resolved path is within the intended directory
    if (!absoluteOutputDir.startsWith(path.resolve(outputDirectory))) {
      throw new Error('Invalid output directory path');
    }

    // Decode the base64 string
    const pdfBuffer = Buffer.from(base64String, 'base64');

    // Create the full file path
    const filePath = path.join(absoluteOutputDir, sanitizedFileName);

    // Write the buffer to a file
    fs.writeFileSync(filePath, pdfBuffer, { flag: 'wx' });

    console.log(chalk.green(`PDF saved successfully: ${filePath}`));
  } catch (error) {
    console.error(chalk.red(`Error saving PDF: ${error.message}`));
    throw error;
  }
}

// Run the script
processStates();
