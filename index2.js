import { default as V } from "./vector.js";
import * as Simulator from "./simulator";

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

const startPosition = V.new(0, 0);
const path = [
  { position: V.new(100, 100), desiredSpeed: 1 },
  { position: V.new(100, 700), desiredSpeed: 1 },
  { position: V.new(700, 700), desiredSpeed: 1 },
  { position: V.new(700, 100), desiredSpeed: 1 },
  { position: V.new(100, 100), desiredSpeed: 1 }
];

const timePath = Simulator.plan(path, {}, startPosition);

function moveLaser(lastPosition, speedPointIdx, timePath, ellapsedTime) {
  const { start, target, speed, acceleration } = timePath[speedPointIdx];
  const position = lastPosition ? lastPosition : start;

  ctx.beginPath();
  ctx.ellipse(position.x, position.y, 10, 10, 0, 0, 2 * Math.PI);
  ctx.stroke();

  const positionToTargetVec = target.sub(position);
  const directionToTarget = positionToTargetVec.unit();
  const speedToTarget = directionToTarget
    .scale(speed)
    .add(directionToTarget.scale(acceleration));
  const nextPosition = position.add(speedToTarget);

  return Math.abs(target.sub(nextPosition).mag()) < 1
    ? [target, (speedPointIdx + 1) % timePath.length]
    : [nextPosition, speedPointIdx];
}

function draw(position, speedPointIdx) {
  return function(timeStamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    path.forEach(p => ctx.lineTo(p.position.x, p.position.y));
    ctx.stroke();

    const [nextPosition, nextIdx] = moveLaser(
      position,
      speedPointIdx,
      timePath,
      timeStamp
    );
    window.requestAnimationFrame(draw(nextPosition, nextIdx));
  };
}

window.requestAnimationFrame(draw(null, 0));
