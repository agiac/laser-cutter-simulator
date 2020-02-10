import * as R from "ramda";
import * as Simulator from "./simulator";

// UTILS

const getElementById = id => document.getElementById(id);
const getElementByIdAndApply = R.curry((fn, id) => R.pipe(getElementById, fn)(id));

const addEventListener = R.curry((type, onEvent, element) =>
  element.addEventListener(type, onEvent)
);
const addOnChangeEventListener = addEventListener("change");

// ---

const simulationHandler = () => {
  var mFile, mSettings;

  return R.curry((file, settings) => {
    if (!mFile) mFile = file;
    if (!mSettings) mSettings = settings;

    if (!mFile || !mSettings) return null;

    //Predict
    Simulator.simulate();
    return 123;
  });
};

const makeSimulation = simulationHandler();
const updateSimulationFromNewSettings = makeSimulation(null);
const updateSimulationFromNewFile = makeSimulation(R.__, null);

// const onSettingsChanged = settings => {
//   updateSimulationFromNewSettings(settings);
// };

// const onFileUpload = file => {
//   updateSimulationFromNewFile(file);
// };

// SETTINGS

const settingsList = Object.freeze(Simulator.settingsList());

const loadSettings = settingsList => {
  var settings = R.zipObj(
    settingsList,
    R.map(getElementByIdAndApply(R.prop("value")), settingsList)
  );

  return (setting, value) => {
    settings = R.set(R.lensProp(setting), value, settings);
    return settings;
  };
};

const updateSettings = loadSettings(settingsList);
const getSettings = () => updateSettings();

const onSettingChanged = e => {
  const { setting, value } = e.target;
  localStorage[setting] = value;
  const updatedSettings = updateSettings(setting, value);
};

const setupSettings = settingsList =>
  R.map(getElementByIdAndApply(addOnChangeEventListener(onSettingChanged)), settingsList);

setupSettings(settingsList);

console.log(getSettings());
