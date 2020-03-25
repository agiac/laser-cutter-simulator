import * as R from "ramda";
import { combineReducers, createStore } from "redux";
import {
  idSelect,
  addOnChangeEventListener,
  addOnClickEventListener,
  setInLocalStorage
} from "./utils";
import * as sdk from "./sdk";
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

const changePath = (project, width, height, scaleX, scaleY, locked) => ({
  type: CHANGE_PATH,
  path: { project, width, height, scaleX, scaleY, locked }
});

const changeAnimation = animation => ({
  type: CHANGE_ANIMATION,
  animation
});

// REDUCERS

const numberFromLocalStorage = key => parseFloat(localStorage[key]);
const valueFromLocalStorage = key => localStorage[key];

const initialSettingsState = {
  maximumSpeedX: numberFromLocalStorage("maximumSpeedX") || 500,
  maximumSpeedY: numberFromLocalStorage("maximumSpeedY") || 500,
  accelerationX: numberFromLocalStorage("accelerationX") || 3000,
  accelerationY: numberFromLocalStorage("accelerationY") || 3000,
  minimumJunctionSpeed: numberFromLocalStorage("minimumJunctionSpeed") || 0,
  junctionDeviation: numberFromLocalStorage("junctionDeviation") || 0.01,
  cuttingSpeed: numberFromLocalStorage("cuttingSpeed") || 100,
  engravingSpeed: numberFromLocalStorage("engravingSpeed") || 100,
  travelSpeed: numberFromLocalStorage("travelSpeed") || 400,
  cutColor: valueFromLocalStorage("cutColor") || "#ff0000",
  engraveColor: valueFromLocalStorage("engraveColor") || "#008000"
};

Object.entries(initialSettingsState).forEach(
  // @ts-ignore
  ([setting, value]) => (idSelect(setting).value = value.toString())
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

const pathReducer = (state = { locked: true, scaleX: 1, scaleY: 1 }, action) => {
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

// @ts-ignore
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

const canvas = /** @type {HTMLCanvasElement} */ (idSelect("canvas"));

window.onresize = () => {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  animationHandler.oneFrame(0);
};

animationHandler.setContext(canvas.getContext("2d"), canvas.width, canvas.height);

const handleChange = async () => {
  // @ts-ignore
  const { settings, animation, lastAction, path } = store.getState();

  if ((lastAction === CHANGE_PATH || lastAction === CHANGE_SETTING) && path.project) {
    const { timeEstimation, simulation, boundingBox } = await sdk.analyzeProject(
      path.project,
      settings
    );

    /** @type {HTMLInputElement} */ (idSelect("project-width")).value = boundingBox.width.toFixed(
      0
    );
    /** @type {HTMLInputElement} */ (idSelect("project-height")).value = boundingBox.height.toFixed(
      0
    );

    const formatSeconds = seconds =>
      `${(seconds / 60).toFixed(0)} min. ${(seconds % 60).toFixed(0)} sec.`;

    idSelect("time-estimation").innerText = formatSeconds(timeEstimation);

    animationHandler.setFrameData(
      simulation,
      { x: boundingBox.minX, y: boundingBox.minY },
      {
        min: { x: boundingBox.minX, y: boundingBox.minY },
        width: boundingBox.width,
        height: boundingBox.height
      },
      0
    );
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
  const value = e.target.type === "number" ? parseFloat(e.target.value) : e.target.value;
  setInLocalStorage(e.target.id, value);
  store.dispatch(changeSetting(e.target.id, value));
};

settingsList.map(R.pipe(idSelect, addOnChangeEventListener(onSettingChanged)));

// FILE UPLOAD DISPATCHER

const fileUploadInputId = "file-upload";

const onFileUpload = async e => {
  const {
    path: { locked, scaleX, scaleY },
    settings
  } = store.getState();

  /**@type {File} */
  const file = e.target.files[0];

  if (!file) return;

  idSelect("time-estimation").innerText = "--- min.";
  idSelect("loader").style.visibility = "visible";

  try {
    const text = await file.text();
    const format = file.name.split(".").pop();

    const project = await sdk.parseFile(text, format);
    const { boundingBox } = await sdk.analyzeProject(project, settings);

    store.dispatch(
      changePath(project, boundingBox.width, boundingBox.height, scaleX, scaleY, locked)
    );
  } catch (error) {
    console.log(error);
    idSelect("loader").style.visibility = "hidden";
  }
};

// @ts-ignore
R.pipe(idSelect, addOnChangeEventListener(onFileUpload))(fileUploadInputId);

const onWidthOrHeightChange = e => {
  const {
    path: { project, width, height, scaleX, scaleY, locked }
  } = store.getState();

  const newWidth =
    e.target.id === "project-width"
      ? parseFloat(e.target.value)
      : locked
      ? (e.target.value / height) * width
      : width;
  const newHeight =
    e.target.id === "project-height"
      ? parseFloat(e.target.value)
      : locked
      ? (e.target.value / width) * height
      : height;

  const newScaleX = newWidth / (width / scaleX);
  const newScaleY = newHeight / (height / scaleY);

  const parser = new DOMParser();
  const doc = parser.parseFromString(project, "image/svg+xml");

  const projectGroup = doc.getElementById("project-group");

  if (projectGroup) projectGroup.setAttribute("transform", `scale(${newScaleX}, ${newScaleY})`);

  const serializer = new XMLSerializer();
  const newProject = serializer.serializeToString(doc);

  store.dispatch(changePath(newProject, newWidth, newHeight, newScaleX, newScaleY, locked));
};

const fileWidthAndHeightSettings = ["project-width", "project-height"];
fileWidthAndHeightSettings.map(R.pipe(idSelect, addOnChangeEventListener(onWidthOrHeightChange)));

const onLockClicked = () => {
  const {
    path: { project, width, height, scaleX, scaleY, locked }
  } = store.getState();

  const newLocked = !locked;

  idSelect("lock-on").style.visibility = newLocked ? "visible" : "hidden";
  idSelect("lock-off").style.visibility = newLocked ? "hidden" : "visible";

  store.dispatch(changePath(project, width, height, scaleX, scaleY, newLocked));
};

const lockProportionsSetting = ["lock-on", "lock-off"];
lockProportionsSetting.map(R.pipe(idSelect, addOnClickEventListener(onLockClicked)));

// ANIMATION DISPATCHER

const onPlay = () => store.dispatch(changeAnimation("play"));

// @ts-ignore
R.pipe(idSelect, addOnClickEventListener(onPlay))("play");

const onPause = () => store.dispatch(changeAnimation("pause"));

// @ts-ignore
R.pipe(idSelect, addOnClickEventListener(onPause))("pause");

const onStop = () => store.dispatch(changeAnimation("stop"));

// @ts-ignore
R.pipe(idSelect, addOnClickEventListener(onStop))("stop");

// ZOOM and PAN

/**
 * @param {WheelEvent} e
 */
const onScroll = e => {
  e.preventDefault();
  animationHandler.zoom(-e.deltaY * 0.001);
};
canvas.addEventListener("wheel", onScroll);

/**
 * @param {PointerEvent} e
 */
const onPointerMove = e => {
  if (e.pressure > 0) {
    e.preventDefault();
    animationHandler.pan(e.movementX * 0.5, e.movementY * 0.5);
  }
};
canvas.addEventListener("pointermove", onPointerMove);
