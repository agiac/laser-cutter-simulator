import {default as V} from './vector.js'


// const a = V.new(1, 1);
// const b = V.new(5, 5);
// const c = b.unit();

// console.log(a, b, c, b.mag());


var canvas = document.createElement("canvas", {});
canvas.width = 600;
canvas.height = 400;

var ctx = canvas.getContext("2d");

const useContext = context => fn => (...args) => fn(context, ...args);

const onContext = useContext(ctx);

const circle = onContext((context, x, y, r) => {
  context.beginPath();
  context.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
  context.stroke();
});








const settingsData = ({ path, accX, accY, maxSpeedX, maxSpeedY }) => ({
  path,
  accX,
  accY,
  maxSpeedX,
  maxSpeedY
});

const frameData = ({ settings, lastPosition, lastSpeed, target }) => ({
  settings: settingsData({ ...settings }),
  lastPosition,
  lastSpeed,
  target
});

const drawFrame = frame => {
  ctx.beginPath();
  frame.settings.path.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();

  const current = frame.lastPosition;

  circle(current.x, current.y, 10);

  const target = frame.settings.path[frame.target];

  const dir = target.sub(current).unit();

  const next = current.add(dir.scale(frame.settings.maxSpeedX));

  const nextTarget = target.sub(next).mag() < 1 ? (frame.target + 1) % frame.settings.path.length : frame.target;

  

  const newFrame = frameData({ ...frame, lastPosition: next, target: nextTarget });

  return newFrame;
};













const draw = frame => () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const newFrame = drawFrame(frame);

 window.requestAnimationFrame(draw(newFrame));
};

const settings = settingsData({
  path: [
    V.new(100, 100),
    V.new(100, 200),
    V.new(200, 200),
    V.new(200, 100),
    V.new(100, 100)
  ],
  accX: 10,
  accY: 10,
  maxSpeedX: 2,
  maxSpeedY: 100
});

window.requestAnimationFrame(
  draw(frameData({ settings, lastPosition: V.new(0,0), target: 0 }))
);

document.body.appendChild(canvas);
