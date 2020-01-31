import { default as V } from "./vector.js";

// const a = V.new(1, 1);
// const b = V.new(5, 5);
// const c = b.unit();

// console.log(a, b, c, b.mag());

var canvas = document.createElement("canvas", {});
canvas.width = 800;
canvas.height = 800;

var ctx = canvas.getContext("2d");

const useContext = context => fn => (...args) => fn(context, ...args);

const onContext = useContext(ctx);

const circle = onContext((context, x, y, r) => {
  context.beginPath();
  context.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
  context.stroke();
});

const settingsData = ({ path, acceleration, maxSpeed }) => ({
  path,
  acceleration,
  maxSpeed
});

const frameData = ({ settings, position, speed, target }) => ({
  settings: settingsData({ ...settings }),
  position,
  speed,
  target
});

const calculateMaximumAcceleration = (axesMaximumAcceleration, direction) => {
  var acceleration;
  if (
    Math.abs(direction.y / direction.x) >
    Math.abs(axesMaximumAcceleration.y / axesMaximumAcceleration.x)
  ) {
    acceleration = Math.abs(axesMaximumAcceleration.y / direction.y);
  } else {
    acceleration = Math.abs(axesMaximumAcceleration.x / direction.x);
  }
  return acceleration;
};

const calculateMaximumSpeed = (axesMaximumSpeed, speed) => {
  var maxSpeed = 1000000000;
  if (
    Math.abs(speed.x) > axesMaximumSpeed.x &&
    Math.abs(speed.y) < axesMaximumSpeed.y
  ) {
    maxSpeed = axesMaximumSpeed.x;
  } else if (
    Math.abs(speed.y) > axesMaximumSpeed.y &&
    Math.abs(speed.x) < axesMaximumSpeed.x
  ) {
    maxSpeed = axesMaximumSpeed.y;
  } else if (
    Math.abs(speed.x) > axesMaximumSpeed.x &&
    Math.abs(speed.y) > axesMaximumSpeed.y
  ) {
    maxSpeed =
      axesMaximumSpeed.x > axesMaximumSpeed.y
        ? axesMaximumSpeed.y
        : axesMaximumSpeed.x;
  }
  return maxSpeed;
};

const drawFrame = frame => {
  const settings = frame.settings;

  //Draw

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  settings.path.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();

  circle(frame.position.x, frame.position.y, 10);

  //Calculate next frame

  const position = frame.position;
  const speed = frame.speed;
  const target = settings.path[frame.target];
  const targetSpeed = 0;

  // PVector desired = PVector.sub(target,location);

  // float d = desired.mag();
  // desired.normalize();
  // if (d < 100) {
  //   float m = map(d,0,100,0,maxspeed);
  //   desired.mult(m);
  // } else {
  //   desired.mult(maxspeed);
  // }

  // PVector steer = PVector.sub(desired,velocity);
  // steer.limit(maxforce);
  // applyForce(steer);

  const positionToTarget = target.sub(position);
  const distanceToTarget = positionToTarget.mag();
  const directionToTarget = positionToTarget.unit();
  const maxAcceleration = calculateMaximumAcceleration(
    settings.acceleration,
    directionToTarget
  );
  const distanceToDecelarate =
    (Math.pow(targetSpeed, 2) - Math.pow(speed.mag(), 2)) /
    (-2 * maxAcceleration);

  var accelerationMag = maxAcceleration;
  if (distanceToTarget > distanceToDecelarate) {
    accelerationMag = maxAcceleration;
  } else {
    accelerationMag =
      (-distanceToTarget / distanceToDecelarate) * maxAcceleration;
  }

  const acceleration = directionToTarget.scale(accelerationMag);
  const speedTemp = speed.add(acceleration);

  var nextSpeed = speedTemp.limit(
    calculateMaximumSpeed(settings.maxSpeed, speedTemp)
  );
  var nextPosition = position.add(nextSpeed);
  var nextTarget = frame.target;
  if (target.sub(nextPosition).mag() < 1) {
    nextPosition = target;
    nextSpeed = V.new(0, 0);
    nextTarget = (frame.target + 1) % (settings.path.length - 1);
  }

  const newFrame = frameData({
    ...frame,
    position: nextPosition,
    target: nextTarget,
    speed: nextSpeed
  });

  return newFrame;
};

const draw = frame => () => {
  const newFrame = drawFrame(frame);

  window.requestAnimationFrame(draw(newFrame));
};

const settings = settingsData({
  path: [
    V.new(100, 100),
    V.new(100, 700),
    V.new(700, 700),
    V.new(700, 100),
    V.new(100, 100)
  ],
  acceleration: V.new(0.1, 0.1),
  maxSpeed: V.new(10, 10)
});

window.requestAnimationFrame(
  draw(
    frameData({
      settings,
      position: V.new(0, 0),
      speed: V.new(0, 0),
      target: 0
    })
  )
);

document.body.appendChild(canvas);
