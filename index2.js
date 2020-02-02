import { default as V } from "./vector.js";
import * as Simulator from "./simulator";

var canvas = document.getElementById("canvas");
const resizeCanvas = canvas => () => {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
};
resizeCanvas(canvas)();
window.onresize = resizeCanvas(canvas);

var ctx = canvas.getContext("2d");

var calculateButton = document.getElementById("calculate-button");
calculateButton.addEventListener("click", () => {
  const maxSpeedX = document.getElementsByName("maximum-speed-x")[0].value;
  const maxSpeedY = document.getElementsByName("maximum-speed-y")[0].value;
  const accelerationX = document.getElementsByName("acceleration-x")[0].value;
  const accelerationY = document.getElementsByName("acceleration-y")[0].value;
  const cuttingSpeed = document.getElementsByName("cutting-speed")[0].value;
  const engravingSpeed = document.getElementsByName("engraving-speed")[0].value;

  const upload = document.getElementsByName("file-upload")[0].files[0];

  if (!upload) {
    document.querySelector(".no-upload").style.visibility = "visible";
  } else {
    document.querySelector(".no-upload").style.visibility = "hidden";
    const uploadURL = window.URL.createObjectURL(upload);
  }

  console.log(
    maxSpeedX,
    maxSpeedY,
    accelerationX,
    accelerationY,
    cuttingSpeed,
    engravingSpeed,
    upload
  );
});


function moveLaser(lastPosition, speedPointIdx, timePath, ellapsedTime) {
  const { start, target, speed, acceleration } = timePath[speedPointIdx];
  const position = lastPosition ? lastPosition : start;

  ctx.beginPath();
  ctx.ellipse(position.x, position.y, 10, 10, 0, 0, 2 * Math.PI);
  ctx.stroke();

  const positionToTargetVec = target.sub(position);
  const directionToTarget = positionToTargetVec.unit();
  const ellapsedTimeSeconds = ellapsedTime / 1000;
  const speedToTarget = directionToTarget
    .scale(speed)
    .add(directionToTarget.scale(acceleration))
    .scale(ellapsedTimeSeconds);

  const nextPosition = position.add(speedToTarget);

  return Math.abs(target.sub(nextPosition).mag()) < speedToTarget.mag()
    ? [target, (speedPointIdx + 1) % timePath.length]
    : [nextPosition, speedPointIdx];
}

const animatePath = timePath => {

  const draw = (position, speedPointIdx, startTime) => () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    path.forEach(p => ctx.lineTo(p.position.x, p.position.y));
    ctx.stroke();

    const now = performance.now();
    const ellapsedTime = now - startTime;

    const [nextPosition, nextIdx] = moveLaser(
      position,
      speedPointIdx,
      timePath,
      ellapsedTime
    );

    window.requestAnimationFrame(draw(nextPosition, nextIdx, now));
  };

  window.requestAnimationFrame(draw(null, 0, 0, performance.now()));
};


const startPosition = V.new(0, 0);

const path = [
  { position: V.new(100, 100), desiredSpeed: 200 },
  { position: V.new(100, 700), desiredSpeed: 200 },
  { position: V.new(700, 700), desiredSpeed: 200 },
  { position: V.new(700, 100), desiredSpeed: 200 },
  { position: V.new(100, 100), desiredSpeed: 200 }
];

const timePath = Simulator.plan(path, {}, startPosition);

animatePath(timePath);