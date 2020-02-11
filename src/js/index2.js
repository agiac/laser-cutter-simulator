import * as R from "ramda";
import * as Simulator from "./simulator";
import { default as V } from "./vector.js";
import { combineReducers, createStore } from "redux";
import {
  idSelect,
  addOnChangeEventListener,
  addOnClickEventListener,
  setInLocalStorage,
  pathFromSvgFile
} from "./utils";
import { AnimationHandler, draw } from "./animation";

// ACTIONS TYPES

const CHANGE_SETTING = "CHANGE_SETTING";
const CHANGE_PATH = "CHANGE_PATH";
const CHANGE_ANIMATION = "CHANGE_ANIMATION";

// ACTIONS CREATORS

const changeSetting = (setting, value) => ({
  type: CHANGE_SETTING,
  change: { setting, value }
});

const changePath = path => ({
  type: CHANGE_PATH,
  path
});

const changeAnimation = animation => ({
  type: CHANGE_ANIMATION,
  animation
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

const animationReducer = (state = null, action) => {
  switch (action.type) {
    case CHANGE_ANIMATION:
      return action.animation;
    default:
      return state;
  }
};

const lastAction = (state = null, action) => {
  return action.type;
};

const appReducer = combineReducers({
  settings: settingsReducer,
  path: pathReducer,
  animation: animationReducer,
  lastAction
});

// STORE

const store = createStore(appReducer);

const animationHandler = AnimationHandler();

const canvas = idSelect("canvas");

animationHandler.setContext(canvas.getContext("2d"), canvas.width, canvas.height);

const handleChange = () => {
  const { settings, path, animation, lastAction } = store.getState();

  if (lastAction === CHANGE_PATH || (lastAction === CHANGE_SETTING && path.length > 0)) {
    const simulation = Simulator.simulate(path, settings, V.new(0, 0));
    const timeEstimation = Simulator.timeEstimation(simulation);

    const formatSeconds = seconds =>
      `${parseInt(seconds / 60)} min. ${parseInt(seconds % 60)} sec.`;
    document.getElementById("time-estimation").innerText = formatSeconds(timeEstimation);

    animationHandler.setFrameData(simulation, V.new(0, 0), 0);
    animationHandler.oneFrame(0);
  } else if (lastAction === CHANGE_ANIMATION) {
    if (animation === "play") {
      animationHandler.play();
    } else if (animation === "pause") {
      animationHandler.pause();
    } else if (animation === "stop") {
      animationHandler.stop();
    }
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
  
  if (!svgFile) return;

  idSelect("time-estimation").innerText = "--- min.";
  idSelect("loader").style.visibility = "visible";

  setTimeout(async () => {
    const path = await pathFromSvgFile(svgFile, store.getState().settings);
    store.dispatch(changePath(path));
  }, 50);
};

R.pipe(idSelect, addOnChangeEventListener(onFileUpload))(fileUploadInputId);

// ANIMATION DISPATCHER

const onPlay = () => store.dispatch(changeAnimation("play"));

R.pipe(idSelect, addOnClickEventListener(onPlay))("play");

const onPause = () => store.dispatch(changeAnimation("pause"));

R.pipe(idSelect, addOnClickEventListener(onPause))("pause");

const onStop = () => store.dispatch(changeAnimation("stop"));

R.pipe(idSelect, addOnClickEventListener(onStop))("stop");
