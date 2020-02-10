/**
 * @typedef {Object} Vector
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} FrameData
 * @property {Vector[]} path
 * @property {Vector} laserPosition
 * @property {number} currentPathIndex
 */

////

/**
 * @param {CanvasRenderingContext2D} renderingContext canvas 2d context
 * @param {number} canvasWidth canvas width
 * @param {number} canvasHeight canvas height
 * @param {FrameData} frameData current frame
 */
const clearFrame = (renderingContext, canvasWidth, canvasHeight) => {
  renderingContext.clearRect(0, 0, canvasWidth, canvasHeight);
};

/**
 * @param {CanvasRenderingContext2D} renderingContext canvas 2d context
 * @param {FrameData} frameData current frame
 */
const renderFrame = (renderingContext, frameData) => {
  const { path, laserPosition } = frameData;
  renderingContext.beginPath();
  renderingContext.moveTo(path[0].start.x, path[0].start.y);
  path.forEach(p => renderingContext.lineTo(p.target.x, p.target.y));
  renderingContext.strokeStyle = "black";
  renderingContext.stroke();

  renderingContext.beginPath();
  renderingContext.ellipse(
    laserPosition.x,
    laserPosition.y,
    5,
    5,
    0,
    0,
    2 * Math.PI
  );
  renderingContext.strokeStyle = "red";
  renderingContext.stroke();
};

const getPositionFromTime = (path, time) => {
  const currentPointIdx = path.findIndex(p => p.time > time);

  if (currentPointIdx >= 0) {
    const currentPoint = path[currentPointIdx];
    const startTime = (path[currentPointIdx - 1] || {}).time || 0;
    const deltaTime = time - startTime;
    const displacement =
      currentPoint.speed * deltaTime +
      0.5 * currentPoint.acceleration * Math.pow(deltaTime, 2);
    return currentPoint.start.add(currentPoint.direction.scale(displacement));
  } else {
    return path[path.length - 1].target;
  }
};

/**
 * @param {FrameData} pastFrame
 * @param {number} ellapsedTIme
 */
const nextFrame = (pastFrame, ellapsedTIme) => {
  const path = pastFrame.path;
  const time = pastFrame.time + ellapsedTIme;

  const laserPosition = getPositionFromTime(path, time);

  return {
    path,
    laserPosition,
    time
  };
};

/**
 *
 * @param {FrameData} frame
 */
const renderLoop = (
  renderingContext,
  canvasWidth,
  canvasHeight,
  frameData,
  timeBefore
) => timeNow => {
  clearFrame(renderingContext, canvasWidth, canvasHeight);
  renderFrame(renderingContext, frameData);
  const newFrame = nextFrame(
    frameData,
    (timeNow - (timeBefore || timeNow)) / 1000
  );
  window.requestAnimationFrame(
    renderLoop(renderingContext, canvasWidth, canvasHeight, newFrame, timeNow)
  );
};

export const draw = (
  renderingContext,
  canvasWidth,
  canvasHeight,
  frameData
) => {
  window.requestAnimationFrame(
    renderLoop(renderingContext, canvasWidth, canvasHeight, frameData, null)
  );
};
