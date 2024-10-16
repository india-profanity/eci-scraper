/**
 * Contains functions to run tasks in parallel
 */
/**
 *
 * @param {*} items
 * @param {*} chunkSize
 * @param {*} processFunction
 * @returns
 */
export async function processInChunks(items, chunkSize, processFunction) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const results = [];
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(processFunction));
    results.push(...chunkResults);
  }
  return results;
}
