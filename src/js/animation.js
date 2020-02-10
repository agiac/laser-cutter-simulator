import { getPositionFromTime } from "./simulator";

/// TYPEDEFS

/**
 * @typedef {import("./simulator").SimulatorOutputPath} SimulatorOutputPath
 */

/**
 * @typedef {Object} Vector
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} FrameData
 * @property {SimulatorOutputPath} path
 * @property {Vector} laserPosition
 * @property {number} time
 */

/**
 * @typedef {Object} RenderingContext
 * @property {CanvasRenderingContext2D} context
 * @property {number} width
 * @property {number} height
 */

/// --- TYPEDEFS end

/**
 * @param {RenderingContext} context
 */
const clearFrame = context => {
  context.context.clearRect(0, 0, context.width, context.height);
};

/**
 * @param {RenderingContext} context
 * @param {FrameData} frameData
 */
const renderFrame = (context, frameData) => {
  const ctx = context.context;
  const { path, laserPosition } = frameData;

  ctx.beginPath();
  ctx.moveTo(path[0].start.x, path[0].start.y);
  path.forEach(p => ctx.lineTo(p.target.x, p.target.y));
  ctx.strokeStyle = "black";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(laserPosition.x, laserPosition.y, 5, 5, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = "red";
  ctx.stroke();
};

/**
 * @param {FrameData} pastFrameData
 * @param {number} ellapsedTIme
 */
const nextFrameData = (pastFrameData, ellapsedTIme) => {
  const path = pastFrameData.path;
  const time = pastFrameData.time + ellapsedTIme;

  const laserPosition = getPositionFromTime(path, time);

  return {
    path,
    laserPosition,
    time
  };
};

/**
 * @param {RenderingContext} context
 * @param {FrameData} frameData
 */
const renderLoop = (context, frameData, timeBefore) => timeNow => {
  clearFrame(context);
  renderFrame(context, frameData);
  const newFrameData = nextFrameData(
    frameData,
    (timeNow - (timeBefore || timeNow)) / 1000
  );
  window.requestAnimationFrame(renderLoop(context, newFrameData, timeNow));
};

/**
 * @param {RenderingContext} context
 * @param {FrameData} frameData
 */
export const draw = (context, frameData) => {
  window.requestAnimationFrame(renderLoop(context, frameData, null));
};
