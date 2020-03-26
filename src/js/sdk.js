/**
 * Makes a fetch request and check the response status
 * @param {RequestInfo} input
 * @param {number} status Expected status
 * @param {RequestInit} [init]
 * @return {Promise<any>}
 */
function fetchExpect(input, status, init = null) {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(input, init);
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (response.status === status) {
        resolve(json);
      } else {
        reject(json);
      }
    } catch {
      reject(text);
    }
  });
}

/**
 * @param {string} file
 * @param {string} format
 */
export function parseFile(file, format) {
  return fetchExpect("/api/parse-file", 200, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ file, format })
  }).then(result => result.project);
}

/**
 *
 * @param {string} project
 * @param {object} settings
 */
export function analyzeProject(project, settings) {
  return fetchExpect("/api/analyse-project", 200, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ project, settings })
  });
}
