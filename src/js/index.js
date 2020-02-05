import { default as V } from "./vector.js";
import * as Simulator from "./simulator";

function givePrediction() {
  const fileData = loadFile();

  //   if (fileData) {
  const settingsData = loadSettings();
  const startPosition = V.new(0, 0);

  // const path = [
  //   { position: V.new(200, 200), desiredSpeed: settingsData.cuttingSpeed },
  //   { position: V.new(200, 0), desiredSpeed: settingsData.cuttingSpeed },
  //   { position: V.new(0, 0), desiredSpeed: settingsData.cuttingSpeed },
  //   { position: V.new(0, 200), desiredSpeed: settingsData.cuttingSpeed },
  //   { position: V.new(200, 200), desiredSpeed: settingsData.cuttingSpeed }
  // ];

  const cX = 100;
  const cY = 100;
  const radius = 100;
  const sides = 10;
  const path = [];

  for (var a = 0; a <= 2 * Math.PI; a += (2 * Math.PI) / sides) {
    const x = cX + Math.cos(a) * radius;
    const y = cY + Math.sin(a) * radius;
    path.push({
      position: V.new(x, y),
      desiredSpeed: settingsData.cuttingSpeed
    });
  }

  const timePath = Simulator.plan(path, settingsData, startPosition);
  const canvas = document.getElementById("canvas");
  animatePath(path, timePath, canvas);

  const timeEstimation = Simulator.estimateTime(timePath); //132.423421341234213 seconds

  const timeEstimationElement = document.getElementById("time-estimation");
  timeEstimationElement.innerText = `${parseInt(
    timeEstimation / 60
  )} min. ${parseInt(timeEstimation % 60)} sec.`;
  //   }
}

function loadSettings() {
  return settings.reduce(
    (res, setting) => ({
      ...res,
      [`${setting}`]: parseFloat(document.getElementsByName(setting)[0].value)
    }),
    {}
  );
}

function loadFile() {
  const upload = document.getElementsByName("file-upload")[0].files[0];

  if (upload) {
    return window.URL.createObjectURL(upload);
  }

  return null;
}

function drawFrame(canvas, path, timePath, laserPosition) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  path.forEach(p => ctx.lineTo(p.position.x, p.position.y));
  ctx.strokeStyle = "black";
  ctx.stroke();
  timePath.forEach(p => {
    ctx.beginPath();
    ctx.ellipse(p.target.x, p.target.y, 4, 4, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = "red";
    ctx.stroke();
  });
  ctx.beginPath();
  // ctx.ellipse(laserPosition.x, laserPosition.y, 10, 10, 0, 0, 2 * Math.PI);
  // ctx.strokeStyle = "black";
  // ctx.stroke();
}

function moveLaser(lastPosition, speedPointIdx, timePath, ellapsedTime) {
  const { start, target, speed, acceleration } = timePath[speedPointIdx];
  const position = lastPosition ? lastPosition : start;
  const positionToTargetVec = target.sub(position);
  const directionToTarget = positionToTargetVec.unit();
  const ellapsedTimeSeconds = ellapsedTime / 1000;
  const speedToTarget = directionToTarget
    .scale(speed)
    .add(directionToTarget.scale(acceleration))
    .scale(ellapsedTimeSeconds);

  const nextPosition = position.add(speedToTarget);

  return Math.abs(target.sub(nextPosition).mag()) < 1
    ? [target, (speedPointIdx + 1) % timePath.length]
    : [nextPosition, speedPointIdx];
}

function animatePath(path, timePath, canvas) {
  const draw = (position, speedPointIdx, startTime) => () => {
    const now = performance.now();
    const ellapsedTime = now - startTime;

    const [nextPosition, nextIdx] = moveLaser(
      position,
      speedPointIdx,
      timePath,
      ellapsedTime
    );

    drawFrame(canvas, path, timePath, nextPosition);

    window.requestAnimationFrame(draw(nextPosition, nextIdx, now));
  };

  window.requestAnimationFrame(draw(null, 0, 0, performance.now()));
}

/// INIT

const settings = Object.freeze([
  "maximumSpeedX",
  "maximumSpeedY",
  "accelerationX",
  "accelerationY",
  "cuttingSpeed"
  // "engravingSpeed"
]);

settings.map(setting =>
  document
    .getElementsByName(setting)[0]
    .addEventListener("change", givePrediction)
);

document
  .getElementsByName("file-upload")[0]
  .addEventListener("change", givePrediction);

window.onresize = () => {
  const canvas = document.getElementById("canvas");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
};

///
