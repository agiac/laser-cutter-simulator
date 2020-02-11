import * as R from "ramda";
import * as Simulator from "./simulator";

// UTILS

const getElementById = id => document.getElementById(id);
const getElementByIdAndApply = R.curry((fn, id) => R.pipe(getElementById, fn)(id));

const addEventListener = R.curry((type, onEvent, element) =>
  element.addEventListener(type, onEvent)
);
const addOnChangeEventListener = addEventListener("change");

const setInLocalStorage = (key, value) => (localStorage[key] = value);
const getFromLocalStorage = key => localStorage[key];

const setValueImpure = R.curry((key, value, obj) => (obj[key] = value));

// ---

const SimulationEvent = new CustomEvent("simulation", {
  detail: { simulationResult: () => getSimulation() }
});

const simulationHandler = () => {
  var mPath, mSettings;

  return R.curry((path, settings) => {
    if (!mPath || path) mPath = path;
    if (!mSettings || settings) mSettings = settings;

    if (!mPath || !mSettings) return null;

    // return Simulator.simulate(path, settings);
    return 123;
  });
};

const getSimulation = simulationHandler();
const updateSimulationFromNewSettings = getSimulation(null);
const updateSimulationFromNewFile = getSimulation(R.__, null);

const onNewSimulation = simulationResult => {
  if (simulationResult) console.log("A new simulation!");
};

// SETTINGS

const settingsList = Object.freeze(Simulator.settingsList());

const loadSettings = settingsList => {
  R.map(
    getElementByIdAndApply(element => {
      setValueImpure("value", getFromLocalStorage(element.id) || element.value, element);
    }),
    settingsList
  );

  return () => {
    return R.zipObj(settingsList, R.map(getElementByIdAndApply(R.prop("value")), settingsList));
  };
};

const getSettings = loadSettings(settingsList);

const onSettingChanged = e => {
  const { id, value } = e.target;
  setInLocalStorage(id, value);
  const updatedSettings = getSettings();
  const simulationResult = updateSimulationFromNewSettings(updatedSettings);
  onNewSimulation(simulationResult);
};

const setupSettings = settingsList =>
  R.map(getElementByIdAndApply(addOnChangeEventListener(onSettingChanged)), settingsList);

setupSettings(settingsList);

// ---

// File

const fileUploadInputId = "file-upload";

const onFileUpload = e => {
  console.log(e.target.files[0]);
  // Get path from file
  var path = [1, 2, 3];
  const simulationResult = updateSimulationFromNewFile(path);
  e.target.dispatchEvent(SimulationEvent);
  onNewSimulation(simulationResult);
};

const setupFileHandling = fileUploadInputId => {
  getElementByIdAndApply(addOnChangeEventListener(onFileUpload), fileUploadInputId);
};

setupFileHandling(fileUploadInputId);

// Display 

getElementByIdAndApply(addEventListener('simulation', () => console.log("Simulation event")), 'time-estimation')

