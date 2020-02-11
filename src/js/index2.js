import * as R from "ramda";
import * as Simulator from "./simulator";
import { default as V } from "./vector.js";
import simplify from "simplify-js";
import { combineReducers, createStore } from "redux";

// UTILS

const getElementById = id => document.getElementById(id);
const getElementByIdAndApply = R.curry((fn, id) => R.pipe(getElementById, fn)(id));

const addEventListener = R.curry((type, onEvent, element) =>
  element.addEventListener(type, onEvent)
);
const addOnChangeEventListener = addEventListener("change");

const setInLocalStorage = (key, value) => (localStorage[key] = value);
const getFromLocalStorage = key => localStorage[key];
const numberFromLocalStorage = R.pipe(getFromLocalStorage, parseFloat);

const setValueImpure = R.curry((key, value, obj) => (obj[key] = value));

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

const getPathFromSVGGeomentryElements = (elements, settings) => {
  const svgPaths = elements.map(element => {
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

  const allX = svgPaths.reduce((res, path) => [...res, ...path.map(p => p.x)], []);
  const allY = svgPaths.reduce((res, path) => [...res, ...path.map(p => p.y)], []);
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);
  const corneredSvgPaths = svgPaths.map(path => path.map(p => ({ x: p.x - minX, y: p.y - minY })));

  return corneredSvgPaths.reduce((result, path) => {
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




// ACTIONS TYPES

const CHANGE_SETTING = "CHANGE_SETTING";
const CHANGE_PATH = "CHANGE_PATH";

// ACTIONS CREATORS

const changeSetting = (setting, value) => ({
  type: CHANGE_SETTING,
  change: { setting, value }
});

const changePath = path => ({
  type: CHANGE_PATH,
  path
});

// REDUCERS

const initialSettingsState = {
  maximumSpeedX: numberFromLocalStorage("maximumSpeedX") || 500,
  maximumSpeedY: numberFromLocalStorage("maximumSpeedY") || 500,
  accelerationX: numberFromLocalStorage("accelerationX") || 3000,
  accelerationY: numberFromLocalStorage("accelerationY") || 3000,
  minimumJunctionSpeed: numberFromLocalStorage("minimumJunctionSpeed") || 0,
  junctionDeviation: numberFromLocalStorage("junctionDeviation") || 0.01,
  cuttingSpeed: numberFromLocalStorage("cuttingSpeed") || 100,
  travelSpeed: numberFromLocalStorage("travelSpeed") || 400
};

const settingsList = R.keys(initialSettingsState);

settingsList.forEach(setting => {
  const ls = getFromLocalStorage(setting);
  const element = getElementById(setting);
  element.value = ls || element.value;
});

const settingsReducer = (state = initialSettingsState, action) => {
  switch (action.type) {
    case CHANGE_SETTING:
      return R.assoc(action.change.setting, action.change.value, state);
    default:
      return state;
  }
};

const pathReducer = (state = [], action) => {
  switch (action.type) {
    case CHANGE_PATH:
      return action.path;
    default:
      return state;
  }
};

const appReducer = combineReducers({ settings: settingsReducer, path: pathReducer });

// STORE

const store = createStore(appReducer);

let previousState = store.getState();

const handleChange = () => {
  const newState = store.getState();

  const getSettings = R.prop("settings");
  const getSetting = R.curry((obj, setting) => R.pipe(getSettings, R.prop(setting))(obj));
  const getNewSetting = getSetting(newState);

  const settingsChanged = Object.keys(getSettings(previousState)).filter(
    key => getSetting(previousState, key) !== getSetting(newState, key)
  );

  settingsChanged.forEach(setting => setInLocalStorage(setting, getNewSetting(setting)));

  previousState = newState;
};

store.subscribe(handleChange);

// SETTINGS CHANGED DISPATCHER

const onSettingChanged = e => e => store.dispatch(changeSetting(e.target.id, e.target.value));

settingsList.map(
  R.pipe(
    getElementById,
    addOnChangeEventListener(onSettingChanged)
  )
);

// FILE UPLOAD DISPATCHER

const fileUploadInputId = "file-upload";

const onFileUpload = async e => {
  const svgFile = e.target.files[0];

  const svgText = await svgFile.text();

  const parser = new DOMParser();
  const svgDocument = parser.parseFromString(svgText, "image/svg+xml");
  const svgElement = svgDocument.querySelector("svg");
  document.body.append(svgElement);

  const svgElements = getSVGGeometryElements(svgElement.children);
  const path = getPathFromSVGGeomentryElements(svgElements, store.getState().settings);

  svgElement.remove();

  dispatchEvent(changePath(path));
};

getElementByIdAndApply(addOnChangeEventListener(onFileUpload), fileUploadInputId);





// ---

// const SimulationEvent = new CustomEvent("simulation", {
//   detail: { simulationResult: () => getSimulation() }
// });

// const simulationHandler = () => {
//   var mPath, mSettings;

//   return R.curry((path, settings) => {
//     if (!mPath || path) mPath = path;
//     if (!mSettings || settings) mSettings = settings;

//     if (!mPath || !mSettings) return null;

//     // return Simulator.simulate(path, settings);
//     return 123;
//   });
// };

// const getSimulation = simulationHandler();
// const updateSimulationFromNewSettings = getSimulation(null);
// const updateSimulationFromNewFile = getSimulation(R.__, null);

// const onNewSimulation = simulationResult => {
//   if (simulationResult) console.log("A new simulation!");
// };

// // SETTINGS

// const settingsList = Object.freeze(Simulator.settingsList());

// const loadSettings = settingsList => {
//   R.map(
//     getElementByIdAndApply(element => {
//       setValueImpure("value", getFromLocalStorage(element.id) || element.value, element);
//     }),
//     settingsList
//   );

//   return () => {
//     return R.zipObj(settingsList, R.map(getElementByIdAndApply(R.prop("value")), settingsList));
//   };
// };

// const getSettings = loadSettings(settingsList);

// const onSettingChanged = e => {
//   const { id, value } = e.target;
//   setInLocalStorage(id, value);
//   const updatedSettings = getSettings();
//   const simulationResult = updateSimulationFromNewSettings(updatedSettings);
//   onNewSimulation(simulationResult);
// };

// const setupSettings = settingsList =>
//   R.map(getElementByIdAndApply(addOnChangeEventListener(onSettingChanged)), settingsList);

// setupSettings(settingsList);

// // ---

// // File

// const fileUploadInputId = "file-upload";

// const onFileUpload = e => {
//   console.log(e.target.files[0]);
//   // Get path from file
//   var path = [1, 2, 3];
//   const simulationResult = updateSimulationFromNewFile(path);
//   e.target.dispatchEvent(SimulationEvent);
//   onNewSimulation(simulationResult);
// };

// const setupFileHandling = fileUploadInputId => {
//   getElementByIdAndApply(addOnChangeEventListener(onFileUpload), fileUploadInputId);
// };

// setupFileHandling(fileUploadInputId);

// // Display

// getElementByIdAndApply(
//   addEventListener("simulation", () => console.log("Simulation event")),
//   "time-estimation"
// );
