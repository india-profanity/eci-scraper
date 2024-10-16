export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry wrapper to handle retries on 500 errors
export async function retryRequest(
  fn,
  failedRequests = [],
  retries = 3,
  delayTime = 100,
) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response && error.response.status === 500) {
      colorLog('Retrying due to 500 error...', 'yellow');
      await delay(delayTime);
      return retryRequest(fn, retries - 1, delayTime * 2); // Exponential backoff
    } else {
      failedRequests.push({ fn, error });
      colorLog(`Request failed: ${error.message}`, 'red');
      return null; // or a default value, depending on your needs
    }
  }
}
