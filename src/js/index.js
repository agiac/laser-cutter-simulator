import * as R from "ramda";
import * as Simulator from "./simulator";
import { default as Vec } from "./vector.js";
import { combineReducers, createStore } from "redux";
import {
  idSelect,
  addOnChangeEventListener,
  addOnClickEventListener,
  setInLocalStorage,
  pathFromSvgFile,
  pathFromSVGpaths
} from "./utils";
import { AnimationHandler } from "./animation";

// ACTIONS TYPES

const CHANGE_SETTING = "CHANGE_SETTING";
const CHANGE_PATH = "CHANGE_PATH";
const CHANGE_ANIMATION = "CHANGE_ANIMATION";

// ACTIONS CREATORS

const changeSetting = (setting, value) => ({
  type: CHANGE_SETTING,
  change: { setting, value }
});

const changePath = (svgPath, path, width, height, locked) => ({
  type: CHANGE_PATH,
  path: { svgPath, path, width, height, locked }
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
const laserStartingPosition = new Vec(10, 10);

const settingsReducer = (state = initialSettingsState, action) => {
  switch (action.type) {
    case CHANGE_SETTING:
      return R.assoc(action.change.setting, action.change.value, state);
    default:
      return state;
  }
};

const pathReducer = (state = { locked: true }, action) => {
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

window.onresize = () => {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  animationHandler.oneFrame(0);
};

animationHandler.setContext(canvas.getContext("2d"), canvas.width, canvas.height);

const handleChange = () => {
  const { settings, path, animation, lastAction } = store.getState();

  if ((lastAction === CHANGE_PATH || lastAction === CHANGE_SETTING) && path.path) {
    const simulation = Simulator.simulate(path.path, settings, laserStartingPosition);
    const timeEstimation = Simulator.timeEstimation(simulation);

    idSelect("file-width").value = path.width.toFixed(0);
    idSelect("file-height").value = path.height.toFixed(0);

    const formatSeconds = seconds =>
      `${parseInt(seconds / 60)} min. ${parseInt(seconds % 60)} sec.`;
    idSelect("time-estimation").innerText = formatSeconds(timeEstimation);

    animationHandler.setFrameData(simulation, laserStartingPosition, 0);
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
    const [svgPath, path, width, height] = await pathFromSvgFile(
      svgFile,
      store.getState().settings
    );
    store.dispatch(changePath(svgPath, path, width, height, store.getState().path.locked));
  }, 50);
};

R.pipe(idSelect, addOnChangeEventListener(onFileUpload))(fileUploadInputId);

const onWidthOrHeightChange = e => {
  const {
    path: { svgPath, width, height, locked },
    settings
  } = store.getState();

  const newWidth =
    e.target.id === "file-width"
      ? parseFloat(e.target.value)
      : locked
      ? (e.target.value / height) * width
      : width;
  const newHeight =
    e.target.id === "file-height"
      ? parseFloat(e.target.value)
      : locked
      ? (e.target.value / width) * height
      : height;

  const [newPath] = pathFromSVGpaths(svgPath, settings, newWidth, newHeight);

  store.dispatch(changePath(svgPath, newPath, newWidth, newHeight, locked));
};

const fileWidthAndHeightSettings = ["file-width", "file-height"];
fileWidthAndHeightSettings.map(R.pipe(idSelect, addOnChangeEventListener(onWidthOrHeightChange)));

const onLockClicked = () => {
  const {
    path: { svgPath, path, width, height, locked }
  } = store.getState();

  const newLocked = !locked;

  idSelect("lock-on").style.visibility = newLocked ? "visible" : "hidden";
  idSelect("lock-off").style.visibility = newLocked ? "hidden" : "visible";

  store.dispatch(changePath(svgPath, path, width, height, newLocked));
};

const lockProportionsSetting = ["lock-on", "lock-off"];
lockProportionsSetting.map(R.pipe(idSelect, addOnClickEventListener(onLockClicked)));

// ANIMATION DISPATCHER

const onPlay = () => store.dispatch(changeAnimation("play"));

R.pipe(idSelect, addOnClickEventListener(onPlay))("play");

const onPause = () => store.dispatch(changeAnimation("pause"));

R.pipe(idSelect, addOnClickEventListener(onPause))("pause");

const onStop = () => store.dispatch(changeAnimation("stop"));

R.pipe(idSelect, addOnClickEventListener(onStop))("stop");
