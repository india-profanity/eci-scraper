/**
 * Contains functions to help with file ops
 */

const fs = require('fs');
const path = require('path');

// Function to check if a folder exists
const folderExists = (folderPath) => {
  return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
};

// Function to create a folder if it doesn't exist
const createFolder = (folderPath) => {
  if (!folderExists(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Function to write a file to a directory
const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
};

// Function to read a file from a directory
const readFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf8');
};

// Function to delete a file from a directory
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Function to delete a directory and all its contents
const deleteDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteDirectory(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
};

// Function to check if a file exists or not
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};
