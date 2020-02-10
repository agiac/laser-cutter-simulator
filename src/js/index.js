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
      [`${setting}`]: parseFloat(document.getElementById(setting).value)
    }),
    {}
  );
};

const loadFile = inputName => {
  return document.getElementById(inputName).files[0];
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
      draw(
        {
          context: canvas.getContext("2d"),
          width: canvas.width,
          height: canvas.height
        },
        {
          path: timePath,
          laserPosition: startPosition,
          time: 0
        }
      );
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
  const timePath = Simulator.simulate(path, settings, startPosition);
  const canvas = document.getElementById("canvas");
  display(startPosition, path, timePath, canvas);

  const timeEstimation = Simulator.timeEstimation(timePath);

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

        console.log(
          `Width: ${Math.max(...allX) - minX}, Height: ${Math.max(...allY) -
            minY}`
        );

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
  const input = document.getElementById(setting);
  // input.value = localStorage[setting] || input.value;
  input.addEventListener("change", givePrediction("settings"));
  // input.addEventListener(
  //   "change",
  //   e => (localStorage[setting] = e.target.value)
  // );
});

document
  .getElementById("file-upload")
  .addEventListener("change", givePrediction("file"));

window.onresize = () => {
  const canvas = document.getElementById("canvas");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  display();
};

///
