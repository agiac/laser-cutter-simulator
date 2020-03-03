import simplify from "simplify-js";
import { default as Vec } from "./vector.js";
import * as R from "ramda";
import { parseSVG, makeAbsolute } from "svg-path-parser";

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

function sortPaths(paths) {
  const back = arr => arr[arr.length - 1];
  const front = arr => arr[0];
  const sqrDist = (a, b) => Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);

  const result = [front(paths)];
  let queue = paths.slice(1, paths.length);

  while (queue.length > 0) {
    const lastPoint = back(back(result));

    const sortedQueue = queue.sort((a, b) => {
      const startA = front(a);
      const startB = front(b);
      return sqrDist(lastPoint, startA) - sqrDist(lastPoint, startB);
    });

    result.push(front(sortedQueue));
    queue = sortedQueue.slice(1, sortedQueue.length);
  }

  return result;
}

function getSVGPathFromSVGGeomentryElements(elements) {
  const rawPaths = elements.map(element => {
    const elementPoints = [];
    const totLength = element.getTotalLength();
    for (var l = 0; l < totLength; l += 2) {
      elementPoints.push({
        x: element.getPointAtLength(l).x,
        y: element.getPointAtLength(l).y
      });
    }
    elementPoints.push(elementPoints[0]);
    return simplify(elementPoints, 0.5);
  });
  return sortPaths(rawPaths);
}

export function pathFromSVGpaths(svgPaths, settings, setWidth = null, setHeight = null) {
  const allX = svgPaths.reduce((res, path) => [...res, ...path.map(p => p.x)], []);
  const allY = svgPaths.reduce((res, path) => [...res, ...path.map(p => p.y)], []);
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);
  const maxX = Math.max(...allX);
  const maxY = Math.max(...allY);
  const widthX = maxX - minX;
  const widthY = maxY - minY;
  const scaleX = setWidth ? setWidth / widthX : 1;
  const scaleY = setHeight ? setHeight / widthY : 1;
  const corneredSvgPaths = svgPaths.map(path =>
    path.map(p => ({ x: (p.x - minX) * scaleX + 11, y: (p.y - minY) * scaleY + 11 }))
  );

  const path = corneredSvgPaths.reduce((result, path) => {
    return [
      ...result,
      ...path.map(({ x, y }, index) => {
        if (index === 0) {
          return {
            position: new Vec(x, y),
            desiredSpeed: settings.travelSpeed,
            type: "travel"
          };
        } else {
          return {
            position: new Vec(x, y),
            desiredSpeed: settings.cuttingSpeed,
            type: "cut"
          };
        }
      })
    ];
  }, []);

  return [path, widthX * scaleX, widthY * scaleY];
}

const getSVGLenghtAttributeValue = R.curry(
  (attribute, element) => element[attribute].baseVal.value
);
const isElement = R.curry((tag, element) => element.tagName === tag);

/**
 *
 * @param {SVGRectElement} rect
 */
function pathFromSVGRect(rect) {
  const result = [];
  const [x, y, w, h, rx, ry] = R.map(getSVGLenghtAttributeValue(R.__, rect), [
    "x",
    "y",
    "width",
    "height",
    "rx",
    "ry"
  ]);

  result.push({ x: x, y: y });
  result.push({ x: x + w, y: y });
  result.push({ x: x + w, y: y + h });
  result.push({ x: x, y: y + h });
  result.push({ x: x, y: y });

  return result;
}

/**
 *
 * @param {SVGCircleElement} circle
 */
function pathFromSVGCircle(circle) {
  const result = [];
  const [cx, cy, r] = R.map(getSVGLenghtAttributeValue(R.__, circle), ["cx", "cy", "r"]);
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    result.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  result.push(result[0]);

  return result;
}

/**
 *
 * @param {SVGEllipseElement} ellipse
 */
function pathFromSVGEllipse(ellipse) {
  return [];
}

/**
 *
 * @param {SVGLineElement} line
 */
function pathFromSVGLine(line) {
  return [];
}

/**
 *
 * @param {SVGPolylineElement} polyline
 */
function pathFromSVGPolyine(polyline) {
  return [];
}

/**
 *
 * @param {SVGPolygonElement} polygon
 */
function pathFromSVGPolygon(polygon) {
  return [];
}

/**
 *
 * @param {SVGPathElement} path
 */
function pathFromSVGpath(path) {
  const d = path.attributes['d'].value;

  const commands = parseSVG(d);
  makeAbsolute(commands);

  const point = (x, y) => ({ x, y });

  let lastPoint = { x: 0, y: 0 };

  const result = [];

  for (let command of commands) {
    if (command.command === "moveto" || command.command === "lineto") {
      lastPoint = point(command['x'], command['y']);
    } else if (command.command === "closepath") {
      lastPoint = result[0];
    } else {
      console.log(command);
    }
    result.push(lastPoint);
  }

  return result;
}

/**
 *
 * @param {SVGGeometryElement[]} shapes
 */
function pathFromSVGShapes(shapes) {
  return shapes.map(shape => {
    const is = isElement(R.__, shape);
    if (is("rect")) {
      return pathFromSVGRect(/** @type {SVGRectElement}*/(shape));
    } else if (is("circle")) {
      return pathFromSVGCircle(/** @type {SVGCircleElement}*/(shape));
    } else if (is("ellipse")) {
      return pathFromSVGEllipse(/** @type {SVGEllipseElement}*/(shape));
    } else if (is("line")) {
      return pathFromSVGLine(/** @type {SVGLineElement}*/(shape));
    } else if (is("polyline")) {
      return pathFromSVGPolyine(/** @type {SVGPolylineElement}}*/(shape));
    } else if (is("polygon")) {
      return pathFromSVGPolygon(/** @type {SVGPolygonElement}*/(shape));
    } else if (is("path")) {
      return pathFromSVGpath(/** @type {any | SVGPathElement}*/(shape));
    } else {
      return [];
    }
  });
}

export async function pathFromSvgFile(svgFile, settings, setWidth = null, setHeight = null) {
  return new Promise(async resolve => {
    const svgText = await svgFile.text();

    const parser = new DOMParser();
    const svgDocument = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDocument.querySelector("svg");
    //document.body.append(svgElement);

    const svgShapes = [
      ...svgElement.querySelectorAll("rect, circle, ellipse, line, polyline, polygon, path")
    ];

    const svgPath = pathFromSVGShapes(/** @type {SVGGeometryElement[]}*/(svgShapes));

    // const svgPath = getSVGPathFromSVGGeomentryElements(svgShapes);
    const [path, width, height] = pathFromSVGpaths(svgPath, settings, setWidth, setHeight);

    //svgElement.remove();

    resolve([svgPath, path, width, height]);
  });
}
