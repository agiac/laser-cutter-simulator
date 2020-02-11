import * as R from "ramda";
import * as Simulator from "./simulator";
import { default as V } from "./vector.js";
import { combineReducers, createStore } from "redux";
import { idSelect, addOnChangeEventListener, setInLocalStorage, pathFromSvgFile } from "./utils";
import { draw } from "./animation";

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

const initialSettingsState = Simulator.defaultSettings();
Object.entries(initialSettingsState).forEach(
  ([setting, value]) => (idSelect(setting).value = value)
);
const settingsList = R.keys(initialSettingsState);

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

const handleChange = () => {
  const { settings, path } = store.getState();

  if (path.length > 0) {
    const simulation = Simulator.simulate(path, settings, V.new(0, 0));
    const timeEstimation = Simulator.timeEstimation(simulation);

    const formatSeconds = seconds =>
      `${parseInt(seconds / 60)} min. ${parseInt(seconds % 60)} sec.`;

    document.getElementById("time-estimation").innerText = formatSeconds(timeEstimation);

    const canvas = idSelect("canvas");

    draw(
      {
        context: canvas.getContext("2d"),
        width: canvas.width,
        height: canvas.height
      },
      {
        path: simulation,
        laserPosition: V.new(0, 0),
        time: 0
      }
    );
  }
  idSelect("loader").style.visibility = "hidden";
};

store.subscribe(handleChange);

// SETTINGS CHANGED DISPATCHER

const onSettingChanged = e => {
  setInLocalStorage(e.target.id, e.target.value);
  store.dispatch(changeSetting(e.target.id, e.target.value));
};

settingsList.map(R.pipe(idSelect, addOnChangeEventListener(onSettingChanged)));

// FILE UPLOAD DISPATCHER

const fileUploadInputId = "file-upload";

const onFileUpload = e => {
  const svgFile = e.target.files[0];

  idSelect("time-estimation").innerText = "--- min.";
  idSelect("loader").style.visibility = "visible";

  setTimeout(async () => {
    const path = await pathFromSvgFile(svgFile, store.getState().settings);
    store.dispatch(changePath(path));
  }, 50);
};

R.pipe(idSelect, addOnChangeEventListener(onFileUpload))(fileUploadInputId);
