import { default as V } from "./vector.js";
import * as Simulator from "./simulator";
import simplify from "simplify-js";
import { draw } from "./animation";

const getSVGGeometryElements = children => {
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
};

const loadSettings = settingsList => {
  return settingsList.reduce(
    (res, setting) => ({
      ...res,
      [`${setting}`]: parseFloat(document.getElementsByName(setting)[0].value)
    }),
    {}
  );
};

const loadFile = inputName => {
  return document.getElementsByName(inputName)[0].files[0];
};

const renderPath = (canvas, path, startPosition) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(startPosition.x, startPosition.y);
  path.forEach(p => ctx.lineTo(p.position.x, p.position.y));
  ctx.strokeStyle = "black";
  ctx.stroke();
  // timePath.forEach(p => {
  //   ctx.beginPath();
  //   ctx.ellipse(p.target.x, p.target.y, 2, 2, 0, 0, 2 * Math.PI);
  //   ctx.fillStyle = "red";
  //   ctx.fill();
  // });
};

const setDisplay = () => {
  let startPosition, path, timePath, canvas;

  return (
    mStartPosition = null,
    mPath = null,
    mTimePath = null,
    mCanvas = null
  ) => {
    if (mStartPosition) startPosition = mStartPosition;
    if (mPath) path = mPath;
    if (mTimePath) timePath = mTimePath;
    if (mCanvas) canvas = mCanvas;

    if (startPosition && path && canvas) {
      const context = canvas.getContext("2d");
      draw(context, canvas.width, canvas.height, {
        path: timePath,
        laserPosition: startPosition,
        currentPathIndex: 0,
        time: 0,
      });
    }
  };
};

const display = setDisplay();

const calculateAndDisplay = (
  svgPaths,
  settings,
  startPosition = V.new(0, 0)
) => {
  const path = pathFromPoints(svgPaths, settings);
  const timePath = Simulator.plan(path, settings, startPosition);
  const canvas = document.getElementById("canvas");
  display(startPosition, path, timePath, canvas);

  const timeEstimation = Simulator.estimateTime(timePath);

  const timeEstimationElement = document.getElementById("time-estimation");
  timeEstimationElement.innerText = `${parseInt(
    timeEstimation / 60
  )} min. ${parseInt(timeEstimation % 60)} sec.`;
};

const pathFromPoints = (pointsPaths, settings) => {
  return pointsPaths.reduce((result, path) => {
    return [
      ...result,
      ...path.map(({ x, y }, index) => {
        if (index === 0) {
          return {
            position: V.new(x, y),
            desiredSpeed: settings.travelSpeed
          };
        } else {
          return {
            position: V.new(x, y),
            desiredSpeed: settings.cuttingSpeed
          };
        }
      })
    ];
  }, []);
};

const memoizeGivePrediction = (settingsList, inputName) => {
  let settings, svgPaths;

  return update => () => {
    if (update === "settings" || !settings) {
      settings = loadSettings(settingsList);
    }

    if (update === "file" || !svgPaths) {
      const file = loadFile(inputName);

      if (!file) {
        return;
      }

      const timeEstimationElement = document.getElementById("time-estimation");
      timeEstimationElement.innerText = `calculating...`;

      const svgElement = document.createElement("object");
      svgElement.type = "image/svg+xml";
      svgElement.data = window.URL.createObjectURL(file);

      svgElement.onload = () => {
        const svg = svgElement.contentDocument;
        const svgGeometryElements = getSVGGeometryElements(svg.children);

        svgPaths = svgGeometryElements.map(element => {
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

        svgElement.style.display = "none";

        const allX = svgPaths.reduce(
          (res, path) => [...res, ...path.map(p => p.x - 10)],
          []
        );
        const allY = svgPaths.reduce(
          (res, path) => [...res, ...path.map(p => p.y - 10)],
          []
        );
        const minX = Math.min(...allX);
        const minY = Math.min(...allY);

        svgPaths = svgPaths.map(path =>
          path.map(p => ({ x: p.x - minX, y: p.y - minY }))
        );

        calculateAndDisplay(svgPaths, settings);
      };

      document.querySelector("canvas").after(svgElement);
    } else {
      calculateAndDisplay(svgPaths, settings);
    }
  };
};

/// INIT

const settingsList = Object.freeze([
  "maximumSpeedX",
  "maximumSpeedY",
  "accelerationX",
  "accelerationY",
  "minimumJunctionSpeed",
  "junctionDeviation",
  "cuttingSpeed",
  "travelSpeed"
  // "engravingSpeed",
]);

const fileUploadInputName = "file-upload";

const givePrediction = memoizeGivePrediction(settingsList, fileUploadInputName);

settingsList.forEach(setting => {
  const input = document.getElementsByName(setting)[0];
  input.value = localStorage[setting] || input.value;
  input.addEventListener("change", givePrediction("settings"));
  input.addEventListener(
    "change",
    e => (localStorage[setting] = e.target.value)
  );
});

document
  .getElementsByName("file-upload")[0]
  .addEventListener("change", givePrediction("file"));

window.onresize = () => {
  const canvas = document.getElementById("canvas");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  display();
};

///
