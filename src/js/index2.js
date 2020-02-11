import * as R from "ramda";
import * as Simulator from "./simulator";
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

// ACTIONS TYPES

const CHANGE_SETTING = "CHANGE_SETTING";
const CHANGE_PATH = "CHANGE_PATH";

// ACTIONS CREATORS

const changeSetting = ({ setting, value }) => ({
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

const unsubscrive = store.subscribe(e => console.log(e));

store.dispatch(changePath([1,2,3]));
store.dispatch(changeSetting({setting: 'maximumSpeedX', value: 123}))





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

getElementByIdAndApply(
  addEventListener("simulation", () => console.log("Simulation event")),
  "time-estimation"
);
