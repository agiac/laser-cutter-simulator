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

export function AnimationHandler() {
  /**
   * @type {RenderingContext}
   */
  var mContext;
  /**
   * @type {FrameData}
   */
  var mFrameData;

  var timeLast = null;
  var isPlaying = false,
    willStop = false;

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

  const renderLoop = timeNow => {
    mFrameData = nextFrameData(mFrameData, (timeNow - (timeLast || timeNow)) / 1000);

    clearFrame(mContext);

    renderFrame(mContext, mFrameData);

    timeLast = timeNow;

    if (mFrameData.time >= mFrameData.path[mFrameData.path.length - 1].time) {
      mFrameData.time = 0;
      isPlaying = false;
    }

    if (isPlaying) {
      if (willStop) {
        isPlaying = false;
        willStop = false;
      }
      window.requestAnimationFrame(renderLoop);
    } else {
      timeLast = null;
    }
  };

  return {
    /**
     * @param {CanvasRenderingContext2D} context
     * @param {number} width
     * @param {number} height
     */
    setContext: (context, width, height) => {
      mContext = { context, width, height };
    },
    /**
     * @param {SimulatorOutputPath} path
     * @param {Vector} laserPosition
     * @param {number} time
     */
    setFrameData: (path, laserPosition, time) => {
      mFrameData = { path, laserPosition, time };
    },
    play: () => {
      if (mContext && mFrameData) {
        isPlaying = true;
        renderLoop(performance.now());
      }
    },
    pause: () => {
      isPlaying = false;
    },
    stop: () => {
      if (mContext && mFrameData) {
        mFrameData.time = 0;
        willStop = isPlaying;
        if (!isPlaying) {
          renderLoop(performance.now());
        }
      }
    },
    oneFrame: time => {
      if (mContext && mFrameData) {
        isPlaying = false;
        mFrameData.time = time;
        renderLoop(performance.now());
      }
    }
  };
}
