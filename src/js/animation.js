/// TYPEDEFS

/**
 * @typedef {Object} SimulatorOutputPoint
 * @property {Vector} start
 * @property {Vector} target
 * @property {Vector} direction
 * @property {number} speed
 * @property {number} acceleration
 * @property {number} time
 */

/**
 * @typedef {SimulatorOutputPoint[]} SimulatorOutputPath
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

function vecScale({ x, y }, scale) {
  return { x: x * scale, y: y * scale };
}

function vecAdd(v1, v2) {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}

function getPositionFromTime(path, time) {
  const currentPointIdx = path.findIndex(p => p.time > time);
  if (currentPointIdx >= 0) {
    const currentPoint = path[currentPointIdx];
    const startTime = (path[currentPointIdx - 1] || {}).time || 0;
    const deltaTime = time - startTime;
    const displacement =
      currentPoint.speed * deltaTime + 0.5 * currentPoint.acceleration * Math.pow(deltaTime, 2);
    return vecAdd(currentPoint.start, vecScale(currentPoint.direction, displacement));
  } else {
    return path[path.length - 1].target;
  }
}

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

// export function AnimationHandler2() {
//   /**
//    * @type {SVGSVGElement}
//    */
//   let mContext;
//   /**
//    * @type {FrameData}
//    */
//   var mFrameData;

//   var timeLast = null;
//   var isPlaying = false,
//     willStop = false;

//   /**
//    * @param {FrameData} pastFrameData
//    * @param {number} ellapsedTIme
//    */
//   const nextFrameData = (pastFrameData, ellapsedTIme) => {
//     const path = pastFrameData.path;
//     const time = pastFrameData.time + ellapsedTIme;

//     const laserPosition = getPositionFromTime(path, time);

//     return {
//       path,
//       laserPosition,
//       time
//     };
//   };

//   const renderLoop = timeNow => {
//     mFrameData = nextFrameData(mFrameData, (timeNow - (timeLast || timeNow)) / 1000);

//     mFrameData.laserPosition

//     renderFrame(mContext, mFrameData);

//     timeLast = timeNow;

//     if (mFrameData.time >= mFrameData.path[mFrameData.path.length - 1].time) {
//       mFrameData.time = 0;
//       isPlaying = false;
//     }

//     if (isPlaying) {
//       if (willStop) {
//         isPlaying = false;
//         willStop = false;
//       }
//       window.requestAnimationFrame(renderLoop);
//     } else {
//       timeLast = null;
//     }
//   };

//   return {
//     /**
//      * @param {SVGSVGElement} context
//      */
//     setCanvas: context => {
//       mContext = context;
//     },
//     /**
//      * @param {SimulatorOutputPath} path
//      * @param {Vector} laserPosition
//      * @param {number} time
//      */
//     setFrameData: (path, laserPosition, time) => {
//       mFrameData = { path, laserPosition, time };
//     },
//     play: () => {
//       if (mContext && mFrameData) {
//         isPlaying = true;
//         renderLoop(performance.now());
//       }
//     },
//     pause: () => {
//       isPlaying = false;
//     },
//     stop: () => {
//       if (mContext && mFrameData) {
//         mFrameData.time = 0;
//         willStop = isPlaying;
//         if (!isPlaying) {
//           renderLoop(performance.now());
//         }
//       }
//     },
//     oneFrame: time => {
//       if (mContext && mFrameData) {
//         isPlaying = false;
//         mFrameData.time = time;
//         renderLoop(performance.now());
//       }
//     }
//   };
// }
