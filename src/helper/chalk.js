import chalk from 'chalk';

// Add colorful logging function
export function colorLog(message, color = 'white') {
  console.log(chalk[color](message));
}
