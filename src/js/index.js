import { default as V } from "./vector.js";
import * as Simulator from "./simulator";
import simplify from "simplify-js"

function getSVGGeometryElements(children) {
  const result = [];

  const recurseChildren = children => {
    for (const child of children) {
      if (child.children.length === 0) {
        if (
          typeof child.getTotalLength === "function" &&
          typeof child.getPointAtLength === "function"
        ) {
          result.push(child);
        }
      } else {
        recurseChildren(child.children);
      }
    }
  };

  recurseChildren(children);

  return result;
}

function givePrediction() {
  const file = loadFile();

  if (file) {
    const settingsData = loadSettings();
    const startPosition = V.new(0, 0);

    const svgElement = document.createElement("object");
    svgElement.type = "image/svg+xml";
    svgElement.data = window.URL.createObjectURL(file);

    svgElement.onload = () => {
      const svg = svgElement.contentDocument;
      const svgGeometryElements = getSVGGeometryElements(svg.children);

      const svgPaths = svgGeometryElements.map(element => {
        const elementPoints = [];
        const totLength = element.getTotalLength();
        for (var l = 0; l < totLength; l += 1) {
          elementPoints.push({
            x: element.getPointAtLength(l).x,
            y: element.getPointAtLength(l).y
          });
        }
        return simplify(elementPoints, 0.5);
      });

      svgElement.style.display = 'none';

      const path = svgPaths.reduce((result, path) => {
        return [
          ...result,
          ...path.map(({ x, y }, index) => {
            if (index === 0) {
              return {
                position: V.new(x, y),
                desiredSpeed: 100
              };
            } else {
              return {
                position: V.new(x, y),
                desiredSpeed: settingsData.cuttingSpeed
              };
            }
          })
        ];
      }, []);

      const allX = path.map(p => p.position.x);
      const allY = path.map(p => p.position.y);
      const maxX = Math.max(...allX);
      const maxY = Math.max(...allY);
      const minX = Math.min(...allX);
      const minY = Math.min(...allY);

      console.log( maxX - minX, maxY - minY);

      // const path = [
      //   { position: V.new(200, 200), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(200, 0), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(0, 0), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(0, 200), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(200, 200), desiredSpeed: settingsData.cuttingSpeed }
      // ];

      // const path = [
      //   { position: V.new(200, 200), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(200, 100), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(200, 0), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(0, 0), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(100, 100), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(0, 200), desiredSpeed: settingsData.cuttingSpeed },
      //   { position: V.new(200, 200), desiredSpeed: settingsData.cuttingSpeed }
      // ];

      // const cX = 100;
      // const cY = 100;
      // const radius = 100;
      // const sides = 40;
      // const path = [];

      // for (var a = 0; a <= 2 * Math.PI; a += (2 * Math.PI) / sides) {
      //   const x = cX + Math.cos(a) * radius;
      //   const y = cY + Math.sin(a) * radius;
      //   path.push({
      //     position: V.new(x, y),
      //     desiredSpeed: settingsData.cuttingSpeed
      //   });
      // }

      const timePath = Simulator.plan(path, settingsData, startPosition);
      const canvas = document.getElementById("canvas");
      animatePath(path, timePath, canvas);

      const timeEstimation = Simulator.estimateTime(timePath);

      const timeEstimationElement = document.getElementById("time-estimation");
      timeEstimationElement.innerText = `${parseInt(
        timeEstimation / 60
      )} min. ${parseInt(timeEstimation % 60)} sec.`;
    };

    document.querySelector("canvas").after(svgElement);
  }

  if (file) {
    file.text().then(text => {
      // const parser = new DOMParser();
      // const svg = parser.parseFromString(text, "image/svg+xml");
      // const svgGeometryElements = getSVGGeometryElements(svg.children);
      // const svgPoints = svgGeometryElements.map(element => {
      //   const elementPoints = [];
      //   console.log(element)
      //   const totLength = element.getTotalLength();
      //   for (var l = 0; l < totLength; l += 1) {
      //     elementPoints.push({
      //       x: element.getPointAtLength(l).x,
      //       y: element.getPointAtLength(l).y
      //     });
      //   }
      //   return elementPoints;
      // });
      // console.log(svgPoints);
    });
  }
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
  return document.getElementsByName("file-upload")[0].files[0];

  // return new Promise((resolve, reject) => {
  //   const upload = document.getElementsByName("file-upload")[0].files[0];

  //   if (upload) {
  //     resolve(upload.text());
  //   } else {
  //     reject("No file uploaded");
  //   }
  // });

  // if (upload) {
  //   return window.URL.createObjectURL(upload);
  // }

  // return null;
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
    ctx.ellipse(p.target.x, p.target.y, 2, 2, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
  });
  // ctx.beginPath();
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
  "minimumJunctionSpeed",
  "junctionDeviation",
  "cuttingSpeed"
  // "engravingSpeed",
]);

settings.forEach(setting => {
  const input = document.getElementsByName(setting)[0];
  input.value = localStorage[setting] || input.value;
  input.addEventListener("change", givePrediction);
  input.addEventListener(
    "change",
    e => (localStorage[setting] = e.target.value)
  );
});

document
  .getElementsByName("file-upload")[0]
  .addEventListener("change", givePrediction);

window.onresize = () => {
  const canvas = document.getElementById("canvas");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
};

///
