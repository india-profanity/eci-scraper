import * as fs from 'fs';
import * as path from 'path';
import { OUTPUT_DIR } from './constants/directories.js';

const StatesDir = path.join(OUTPUT_DIR, 'metadata', 'states');

const stateFolders = fs.readdirSync(StatesDir);
console.log(stateFolders);