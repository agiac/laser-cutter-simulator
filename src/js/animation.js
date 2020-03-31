/// TYPEDEFS

/**
 * @typedef {Object} SimulatorOutputPoint
 * @property {Vector} start
 * @property {Vector} target
 * @property {Vector} direction
 * @property {number} speed
 * @property {number} acceleration
 * @property {number} time
 * @property {string} movement
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
 * @property {{min: Vector, width: number, height: number}} boundingBox
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
    return path[path.length - 1] ? path[path.length - 1].target : { x: 0, y: 0 };
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

  var zoom = 1,
    panX = 0,
    panY = 0;

  /**
   * @param {RenderingContext} context
   * @param {FrameData} frameData
   */
  const renderFrame = (context, frameData) => {
    const { path, laserPosition, boundingBox } = frameData;

    const ctx = context.context;

    ctx.lineWidth = 1 / zoom;

    ctx.resetTransform();
    ctx.clearRect(0, 0, context.width, context.height);
    ctx.transform(zoom, 0, 0, zoom, panX, panY);

    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(laserPosition.x, laserPosition.y - 5 / zoom);
    ctx.lineTo(laserPosition.x, laserPosition.y + 5 / zoom);
    ctx.moveTo(laserPosition.x - 5 / zoom, laserPosition.y);
    ctx.lineTo(laserPosition.x + 5 / zoom, laserPosition.y);
    ctx.strokeStyle = "red";
    ctx.stroke();

    if (path.length > 0) {
      let lastMovement = null;

      for (let p of path) {
        if (lastMovement !== p.movement) {
          if (lastMovement) {
            ctx.strokeStyle =
              lastMovement === "cut" ? "black" : lastMovement === "engrave" ? "gray" : "lightcoral";
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(p.start.x, p.start.y);
        }
        ctx.lineTo(p.target.x, p.target.y);

        lastMovement = p.movement;
      }

      if (lastMovement) {
        ctx.strokeStyle =
          lastMovement === "cut" ? "black" : lastMovement === "engrave" ? "gray" : "lightcoral";
        ctx.stroke();
      }
    }

    ctx.rect(boundingBox.min.x, boundingBox.min.y, boundingBox.width, boundingBox.height);
    ctx.setLineDash([2 / zoom, 5 / zoom]);
    ctx.strokeStyle = "green";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -10000);
    ctx.lineTo(0, 10000);
    ctx.moveTo(-10000, 0);
    ctx.lineTo(10000, 0);
    ctx.strokeStyle = "lightblue";
    ctx.setLineDash([]);
    ctx.stroke();
  };

  /**
   * @param {FrameData} pastFrameData
   * @param {number} ellapsedTIme
   */
  const nextFrameData = (pastFrameData, ellapsedTIme) => {
    const path = pastFrameData.path;
    const boundingBox = pastFrameData.boundingBox;
    const time = pastFrameData.time + ellapsedTIme;

    const laserPosition = getPositionFromTime(path, time);

    return {
      path,
      laserPosition,
      boundingBox,
      time
    };
  };

  const renderLoop = timeNow => {
    mFrameData = nextFrameData(mFrameData, (timeNow - (timeLast || timeNow)) / 1000);

    renderFrame(mContext, mFrameData);

    timeLast = timeNow;

    if (mFrameData.time >= mFrameData.path[mFrameData.path.length - 1]?.time) {
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
     * @param {{min: Vector, width: number, height: number}} boundingBox
     * @param {number} time
     */
    setFrameData: (path, laserPosition, boundingBox, time) => {
      mFrameData = { path, laserPosition, boundingBox, time };
      zoom = Math.min(
        (mContext.width - 100) / boundingBox.width,
        (mContext.height - 100) / boundingBox.height
      );
      panX = mContext.width / 2 - (boundingBox.min.x + boundingBox.width / 2) * zoom;
      panY = mContext.height / 2 - (boundingBox.min.y + boundingBox.height / 2) * zoom;
    },
    zoom: increment => {
      if (mContext && mFrameData) {
        zoom = Math.max(0.1, zoom + increment * zoom);
        renderFrame(mContext, mFrameData);
      }
    },
    pan: (incrementX, incrementY) => {
      if (mContext && mFrameData) {
        panX += incrementX;
        panY += incrementY;
        renderFrame(mContext, mFrameData);
      }
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
