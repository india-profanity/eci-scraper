import fs from 'fs';
import path from 'path';
import { minioClient, fileExistsInMinio } from './helper/minio.js';
import * as dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.MINIO_BUCKET_NAME;

export function generatePDFNamesList() {
  const statesDir = path.join(process.cwd(), 'output', 'metadata', 'states');
  fs.readdirSync(statesDir).forEach((state) => {
    const stateDir = path.join(statesDir, state);
    const partsJsonPath = path.join(stateDir, 'parts.json');
    const pdfNamesList = [];

    if (fs.existsSync(partsJsonPath)) {
      const partsData = JSON.parse(fs.readFileSync(partsJsonPath, 'utf8'));

      partsData.forEach((part) => {
        if (part) {
          pdfNamesList.push({
            state,
            pdfName: `${part.stateCd}_district${part.districtCd}_ac${part.acNumber}_part${part.partNumber}.pdf`,
            downloadStatus: 'pending',
          });
        }
      });

      const outputPath = path.join(stateDir, 'pdfs.json');
      fs.writeFileSync(outputPath, JSON.stringify(pdfNamesList, null, 2));
      console.log(
        `PDF names list for ${state} has been written to ${outputPath}`,
      );
    }
  });
}

export async function updateDownloadStatus(pdfNamesList) {
  for (const item of pdfNamesList) {
    try {
      const exists = await fileExistsInMinio(
        `metadata/${item.state}/pdfs/${item.pdfName}`,
      );
      item.downloadStatus = exists ? 'downloaded' : 'pending';
    } catch (err) {
      console.error(
        `Error checking Minio for metadata/${item.state}/pdfs/${item.pdfName}:`,
        err,
      );
    }
  }

  const outputPath = path.join(process.cwd(), 'pdfs.json');
  fs.writeFileSync(outputPath, JSON.stringify(pdfNamesList, null, 2));
  console.log(`Updated PDF names list has been written to ${outputPath}`);

  return pdfNamesList;
}

export function showStateMetrics(state) {
  const pdfNamesListPath = path.join(process.cwd(), 'pdfs.json');

  if (!fs.existsSync(pdfNamesListPath)) {
    console.error(
      'pdfs.json file not found. Please generate the PDF list first.',
    );
    return;
  }

  const pdfNamesList = JSON.parse(fs.readFileSync(pdfNamesListPath, 'utf8'));

  const stateData = pdfNamesList.filter((item) => item.state === state);
  const totalPDFs = stateData.length;
  const downloadedPDFs = stateData.filter(
    (item) => item.downloadStatus === 'downloaded',
  ).length;
  const notDownloadedPDFs = totalPDFs - downloadedPDFs;

  console.log(`Metrics for ${state}:`);
  console.log(`Total number of PDFs: ${totalPDFs}`);
  console.log(`Number of downloaded PDFs: ${downloadedPDFs}`);
  console.log(`Number of not downloaded PDFs: ${notDownloadedPDFs}`);
}

export async function refreshStateDownloadStatus(state) {
  const pdfNamesListPath = path.join(process.cwd(), 'pdfs.json');

  if (!fs.existsSync(pdfNamesListPath)) {
    console.error(
      'pdfs.json file not found. Please generate the PDF list first.',
    );
    return;
  }

  let pdfNamesList = JSON.parse(fs.readFileSync(pdfNamesListPath, 'utf8'));

  for (const item of pdfNamesList) {
    if (item.state === state && item.downloadStatus !== 'downloaded') {
      try {
        const exists = await fileExistsInMinio(`${item.state}/${item.pdfName}`);
        item.downloadStatus = exists ? 'downloaded' : 'pending';
      } catch (err) {
        console.error(
          `Error checking Minio for ${item.state}/${item.pdfName}:`,
          err,
        );
      }
    }
  }

  fs.writeFileSync(pdfNamesListPath, JSON.stringify(pdfNamesList, null, 2));
  console.log(`Updated PDF names list has been written to ${pdfNamesListPath}`);

  showStateMetrics(state);
}

// Usage example
// async function main() {
//   const state = 'California'; // Replace with the desired state name
//   const minioBucket = 'your-minio-bucket-name';

//   showStateMetrics(state);
//   await refreshStateDownloadStatus(state, minioBucket);
// }

// main().catch(console.error);
