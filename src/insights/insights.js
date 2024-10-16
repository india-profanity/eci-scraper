import fs from 'fs';
import path from 'path';
import { OUTPUT_DIR } from '../constants/directories.js';
import chalk from 'chalk';
import { colorLog } from '../helper/chalk.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const StatesDir = path.join(OUTPUT_DIR, 'metadata', 'states');
const InsightsDir = path.join(OUTPUT_DIR, 'insights');

// Helper function to read JSON files
function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Get total number of parts across all states
export function getTotalParts() {
  let totalParts = 0;
  const stateFolders = fs.readdirSync(StatesDir);

  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;
    const partsJsonPath = path.join(StatesDir, folder, 'parts.json');
    if (fs.existsSync(partsJsonPath)) {
      const parts = readJsonFile(partsJsonPath);
      totalParts += parts.length;
    }
  }
  return totalParts;
}

// Get number of parts per state
export function getPartsPerState() {
  const partsPerState = {};
  const stateFolders = fs.readdirSync(StatesDir);

  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;
    const stateJsonPath = path.join(StatesDir, folder, 'state.json');
    const partsJsonPath = path.join(StatesDir, folder, 'parts.json');
    if (fs.existsSync(stateJsonPath) && fs.existsSync(partsJsonPath)) {
      const stateData = readJsonFile(stateJsonPath);
      const parts = readJsonFile(partsJsonPath);
      partsPerState[stateData.stateName] = parts.length;
    }
  }
  return partsPerState;
}

// Get number of constituencies per state
export function getConstituenciesPerState() {
  const constituenciesPerState = {};
  const stateFolders = fs.readdirSync(StatesDir);

  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;
    const stateJsonPath = path.join(StatesDir, folder, 'state.json');
    if (fs.existsSync(stateJsonPath)) {
      const stateData = readJsonFile(stateJsonPath);
      const constituencies = stateData.districts.flatMap((d) => d.acs);
      constituenciesPerState[stateData.stateName] = constituencies.length;
    }
  }
  return constituenciesPerState;
}

// Get all state names
export function getStateNames() {
  const stateNames = [];
  const stateFolders = fs.readdirSync(StatesDir);

  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;
    const stateJsonPath = path.join(StatesDir, folder, 'state.json');
    if (fs.existsSync(stateJsonPath)) {
      const stateData = readJsonFile(stateJsonPath);
      stateNames.push(stateData.stateName);
    }
  }
  return stateNames;
}

// Get constituencies for a specific state
export function getConstituenciesForState(stateName) {
  const stateFolders = fs.readdirSync(StatesDir);

  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;
    const stateJsonPath = path.join(StatesDir, folder, 'state.json');
    if (fs.existsSync(stateJsonPath)) {
      const stateData = readJsonFile(stateJsonPath);
      if (stateData.stateName === stateName) {
        return stateData.districts.flatMap((d) => d.acs.map((ac) => ac.acName));
      }
    }
  }
  return [];
}

// Get parts for a specific state
export function getPartsForState(stateName) {
  const stateFolders = fs.readdirSync(StatesDir);

  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;
    const stateJsonPath = path.join(StatesDir, folder, 'state.json');
    const partsJsonPath = path.join(StatesDir, folder, 'parts.json');
    if (fs.existsSync(stateJsonPath) && fs.existsSync(partsJsonPath)) {
      const stateData = readJsonFile(stateJsonPath);
      if (stateData.stateName === stateName) {
        return readJsonFile(partsJsonPath);
      }
    }
  }
  return [];
}

// New function to get detailed state data
function getDetailedStateData() {
  const stateData = {};
  const missingData = {};
  const stateFolders = fs.readdirSync(StatesDir);

  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;
    const stateJsonPath = path.join(StatesDir, folder, 'state.json');
    const partsJsonPath = path.join(StatesDir, folder, 'parts.json');

    if (fs.existsSync(stateJsonPath) && fs.existsSync(partsJsonPath)) {
      const stateInfo = readJsonFile(stateJsonPath);
      const parts = readJsonFile(partsJsonPath);

      missingData[stateInfo.stateName] = [];

      stateData[stateInfo.stateName] = {
        districts: stateInfo.districts.map((district) => ({
          name: district.districtName,
          constituencies: district.acs.map((ac) => {
            const validParts = parts.filter(
              (part) => part && part.acNo === ac.acNo,
            );
            const invalidParts = parts.filter(
              (part) => !part || part.acNo !== ac.acNo,
            );

            if (invalidParts.length > 0) {
              missingData[stateInfo.stateName].push({
                district: district.districtName,
                constituency: ac.acName,
                invalidParts: invalidParts,
              });
            }

            return {
              name: ac.acName,
              parts: validParts.map((part) => part.partNo),
            };
          }),
        })),
      };
    }
  }

  // Write missing data to a separate file
  const missingDataPath = path.join(InsightsDir, 'missing_data.json');
  fs.writeFileSync(missingDataPath, JSON.stringify(missingData, null, 2));
  colorLog(`Missing data written to ${missingDataPath}`, 'yellow');

  return stateData;
}

// Helper function to write JSON to file
function writeJsonToFile(filePath, data, append = false) {
  const jsonString = JSON.stringify(data, null, 2);
  if (append) {
    appendFileSync(filePath, jsonString.slice(1, -1) + ',\n', 'utf8');
  } else {
    writeFileSync(filePath, jsonString, 'utf8');
  }
}

// New function to write metrics to a separate file
function writeMetricsToFile() {
  const metricsPath = path.join(InsightsDir, 'metrics.json');
  const metrics = {
    totalParts: getTotalParts(),
    partsPerState: getPartsPerState(),
    constituenciesPerState: getConstituenciesPerState(),
    stateNames: getStateNames(),
  };
  writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
  colorLog(`Metrics written to ${metricsPath}`, 'green');
}

// Modified function to write insights to separate files
export function writeInsightsToFile() {
  // Ensure the insights directory exists
  if (!existsSync(InsightsDir)) {
    mkdirSync(InsightsDir, { recursive: true });
  }

  // Write metrics to a separate file
  writeMetricsToFile();

  // Process each state individually
  const stateFolders = fs.readdirSync(StatesDir);
  for (const folder of stateFolders) {
    if (folder === '.DS_Store') continue;

    const stateJsonPath = path.join(StatesDir, folder, 'state.json');
    const partsJsonPath = path.join(StatesDir, folder, 'parts.json');

    if (existsSync(stateJsonPath) && existsSync(partsJsonPath)) {
      const stateInfo = readJsonFile(stateJsonPath);
      const parts = readJsonFile(partsJsonPath);

      const stateDir = path.join(InsightsDir, 'states', stateInfo.stateName);
      mkdirSync(stateDir, { recursive: true });

      stateInfo.districts.forEach((district) => {
        const districtData = {
          name: district.districtName,
          constituencies: district.acs.map((ac) => {
            const validParts = parts.filter(
              (part) => part && part.acNo === ac.acNo,
            );
            return {
              name: ac.acName,
              parts: validParts.map((part) => part.partNo),
            };
          }),
        };

        const districtPath = path.join(
          stateDir,
          `${district.districtName}.json`,
        );
        writeFileSync(districtPath, JSON.stringify(districtData, null, 2));
      });

      colorLog(
        `Data for ${stateInfo.stateName} written to ${stateDir}`,
        'green',
      );
    }
  }

  colorLog(`All insights written to ${InsightsDir}`, 'green');
}

// Modified function to display insights
export function displayInsights(options) {
  colorLog('Showing insights:', 'blue');

  const metricsPath = path.join(InsightsDir, 'metrics.json');
  if (!existsSync(metricsPath)) {
    colorLog(
      'Metrics file not found. Please run writeInsightsToFile() first.',
      'red',
    );
    return;
  }

  const metrics = readJsonFile(metricsPath);

  if (options.state) {
    const statePath = path.join(InsightsDir, 'states', options.state);
    if (!existsSync(statePath)) {
      colorLog(`No data found for state: ${options.state}`, 'red');
      return;
    }

    colorLog(`Insights for state: ${options.state}`, 'green');
    const districtFiles = fs.readdirSync(statePath);
    let totalConstituencies = 0;
    let totalParts = 0;

    districtFiles.forEach((file) => {
      const districtData = readJsonFile(path.join(statePath, file));
      totalConstituencies += districtData.constituencies.length;
      totalParts += districtData.constituencies.reduce(
        (sum, constituency) => sum + constituency.parts.length,
        0,
      );
    });

    console.log(chalk.cyan(`Number of districts: ${districtFiles.length}`));
    console.log(chalk.cyan(`Number of constituencies: ${totalConstituencies}`));
    console.log(chalk.cyan(`Number of parts: ${totalParts}`));
  } else {
    colorLog('Overall Metrics:', 'yellow');
    console.log(chalk.cyan(JSON.stringify(metrics, null, 2)));
  }
}
