// import simplify from "simplify-js";
// import { default as V } from "./vector.js";
import * as R from "ramda";
import { async } from "q";

/**
 * @param {number} n
 * @param {number} precision
 * @returns {number}
 */
export function isZero(n, precision = 0.000001) {
  if (Math.abs(n) < precision) return 0;
  return n;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} precision
 * @returns {boolean}
 */
export function approxEqual(a, b, precision = 0.000001) {
  return Math.abs(a - b) <= precision;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} precision
 * @returns {boolean}
 */
export function approxGreater(a, b, precision = 0.000001) {
  return a - b > precision;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} precision
 * @returns {boolean}
 */
export function approxGreateOrEqual(a, b, precision = 0.000001) {
  return approxGreater(a, b, precision) || approxEqual(a, b, precision);
}

export const querySelect = selector => document.querySelector(selector);

export const idSelect = id => document.getElementById(id);

export const addEventListener = R.curry((type, onEvent, element) =>
  element.addEventListener(type, onEvent)
);

export const addOnChangeEventListener = addEventListener("change");
export const addOnClickEventListener = addEventListener("click");

export function setInLocalStorage(key, value) {
  localStorage[key] = value;
}

// function getSVGGeometryElements(children) {
//   const result = [];

//   const recurseChildren = children => {
//     for (const child of children) {
//       if (child.children.length === 0) {
//         if (
//           typeof child.getTotalLength === "function" &&
//           typeof child.getPointAtLength === "function"
//         ) {
//           result.push(child);
//         }
//       } else {
//         recurseChildren(child.children);
//       }
//     }
//   };

//   recurseChildren(children);

//   return result;
// }

// function sortPaths(paths) {
//   const back = arr => arr[arr.length - 1];
//   const front = arr => arr[0];
//   const sqrDist = (a, b) => Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);

//   const result = [front(paths)];
//   let queue = paths.slice(1, paths.length);

//   while (queue.length > 0) {
//     const lastPoint = back(back(result));

//     const sortedQueue = queue.sort((a, b) => {
//       const startA = front(a);
//       const startB = front(b);
//       return sqrDist(lastPoint, startA) - sqrDist(lastPoint, startB);
//     });

//     result.push(front(sortedQueue));
//     queue = sortedQueue.slice(1, sortedQueue.length);
//   }

//   return result;
// }

// function getSVGPathFromSVGGeomentryElements(elements) {
//   const rawPaths = elements.map(element => {
//     const elementPoints = [];
//     const totLength = element.getTotalLength();
//     for (var l = 0; l < totLength; l += 2) {
//       elementPoints.push({
//         x: element.getPointAtLength(l).x,
//         y: element.getPointAtLength(l).y
//       });
//     }
//     return simplify(elementPoints, 0.5);
//   });
//   return sortPaths(rawPaths);
// }

// export function pathFromSVGpath(svgPath, settings, setWidth = null, setHeight = null) {
//   const allX = svgPath.reduce((res, path) => [...res, ...path.map(p => p.x)], []);
//   const allY = svgPath.reduce((res, path) => [...res, ...path.map(p => p.y)], []);
//   const minX = Math.min(...allX);
//   const minY = Math.min(...allY);
//   const maxX = Math.max(...allX);
//   const maxY = Math.max(...allY);
//   const widthX = maxX - minX;
//   const widthY = maxY - minY;
//   const scaleX = setWidth ? setWidth / widthX : 1;
//   const scaleY = setHeight ? setHeight / widthY : 1;
//   const corneredSvgPaths = svgPath.map(path =>
//     path.map(p => ({ x: (p.x - minX) * scaleX + 11, y: (p.y - minY) * scaleY + 11 }))
//   );

//   const path = corneredSvgPaths.reduce((result, path) => {
//     return [
//       ...result,
//       ...path.map(({ x, y }, index) => {
//         if (index === 0) {
//           return {
//             position: V.new(x, y),
//             desiredSpeed: settings.travelSpeed,
//             type: "travel"
//           };
//         } else {
//           return {
//             position: V.new(x, y),
//             desiredSpeed: settings.cuttingSpeed,
//             type: "cut"
//           };
//         }
//       })
//     ];
//   }, []);

//   return [path, widthX * scaleX, widthY * scaleY];
// }

// export async function pathFromSvgFile(svgFile, settings, setWidth = null, setHeight = null) {
//   return new Promise(async resolve => {
//     const svgText = await svgFile.text();

//     const parser = new DOMParser();
//     const svgDocument = parser.parseFromString(svgText, "image/svg+xml");
//     const svgElement = svgDocument.querySelector("svg");
//     document.body.append(svgElement);

//     const svgElements = getSVGGeometryElements(svgElement.children);
//     const svgPath = getSVGPathFromSVGGeomentryElements(svgElements);
//     const [path, width, height] = pathFromSVGpath(svgPath, settings, setWidth, setHeight);

//     svgElement.remove();

//     resolve([svgPath, path, width, height]);
//   });
// }
