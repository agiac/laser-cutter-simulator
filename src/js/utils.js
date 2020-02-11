import simplify from "simplify-js";
import { default as V } from "./vector.js";
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

function getSVGGeometryElements(children) {
  const result = [];

  const recurseChildren = children => {
    for (const child of children) {
      if (child.children.length === 0) {
        if (
          typeof child.getTotalLength === "function" &&
          typeof child.getPointAtLength === "function"
        ) {
          result.push(child);
        }
      } else {
        recurseChildren(child.children);
      }
    }
  };

  recurseChildren(children);

  return result;
}

function getPathFromSVGGeomentryElements(elements, settings) {
  const svgPaths = elements.map(element => {
    const elementPoints = [];
    const totLength = element.getTotalLength();
    for (var l = 0; l < totLength; l += 1) {
      elementPoints.push({
        x: element.getPointAtLength(l).x,
        y: element.getPointAtLength(l).y
      });
    }
    return simplify(elementPoints, 0.5);
  });

  const allX = svgPaths.reduce((res, path) => [...res, ...path.map(p => p.x)], []);
  const allY = svgPaths.reduce((res, path) => [...res, ...path.map(p => p.y)], []);
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);
  const corneredSvgPaths = svgPaths.map(path =>
    path.map(p => ({ x: p.x - minX + 10, y: p.y - minY + 10 }))
  );

  return corneredSvgPaths.reduce((result, path) => {
    return [
      ...result,
      ...path.map(({ x, y }, index) => {
        if (index === 0) {
          return {
            position: V.new(x, y),
            desiredSpeed: settings.travelSpeed
          };
        } else {
          return {
            position: V.new(x, y),
            desiredSpeed: settings.cuttingSpeed
          };
        }
      })
    ];
  }, []);
}

export async function pathFromSvgFile(svgFile, settings) {
  return new Promise(async resolve => {
    const svgText = await svgFile.text();

    const parser = new DOMParser();
    const svgDocument = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDocument.querySelector("svg");
    document.body.append(svgElement);

    const svgElements = getSVGGeometryElements(svgElement.children);
    const path = getPathFromSVGGeomentryElements(svgElements, settings);

    svgElement.remove();

    resolve(path);
  });
}
