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
    const json = await response.json();
    if (response.status === status) {
      resolve(json);
    } else {
      reject(json);
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
  }).then(result => result.parsed);
}

/**
 *
 * @param {string} project
 * @param {string} material
 */
export function analyzeProject(project, material) {
  return fetchExpect("/api/analyse-project", 200, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ project: project, material: material })
  });
}
