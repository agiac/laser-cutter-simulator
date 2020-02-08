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
  path.forEach(p => renderingContext.lineTo(p.start.x, p.start.y));
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

const moveLaser = (
  start,
  currentPosition,
  target,
  speed,
  acceleration,
  ellapsedTime
) => {
  const startToTarget = target.sub(start);
  const currentToTarget = currentPosition.sub(start);
  if (currentToTarget.mag() > startToTarget.mag()) return null;
  const dir = startToTarget.unit();
  const displacement =
    speed * ellapsedTime + 0.5 * acceleration * Math.pow(ellapsedTime, 2);
  return currentPosition.add(dir.scale(displacement));
};

/**
 * @param {FrameData} pastFrame
 * @param {number} ellapsedTIme
 */
const nextFrame = (pastFrame, ellapsedTIme) => {
  const { path, currentPathIndex, laserPosition, time } = pastFrame;
  const currentPoint = path[currentPathIndex];

  const newLaserPosition = moveLaser(
    currentPoint.start,
    laserPosition,
    currentPoint.target,
    currentPoint.speed,
    currentPoint.acceleration,
    time
  );

  if (newLaserPosition) {
    return {
      path,
      currentPathIndex,
      laserPosition: newLaserPosition,
      time: time + ellapsedTIme
    };
  } else {
    const newPathIndex = currentPathIndex + 1;
    return {
      path,
      currentPathIndex: newPathIndex,
      laserPosition: path[newPathIndex].start,
      time: 0
    };
  }
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
