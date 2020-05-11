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

// SETTINGS

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

const getSettings = () =>
  settingsList.reduce((settings, setting) => {
    const element = /** @type {HTMLInputElement}*/ (idSelect(setting));
    const value = element.type === "number" ? parseFloat(element.value) : element.value;
    return { ...settings, [setting]: value };
  }, {});

const onSettingChanged = async e => {
  const {
    path: { locked, scaleX, scaleY, project }
  } = store.getState();

  const value =
    e.target.type === "number"
      ? Math.max(parseFloat(e.target.value), e.target.min)
      : e.target.value;
  e.target.value = value;
  const settings = { ...getSettings(), [e.target.id]: value };

  setInLocalStorage(e.target.id, settings[e.target.id]);

  if (project) {
    idSelect("time-estimation").innerText = "--- min.";
    idSelect("loader").style.visibility = "visible";

    const analysis = await sdk.analyzeProject(project, settings, true);
    store.dispatch(changePath(project, scaleX, scaleY, locked, analysis));
  }
};

settingsList.map(R.pipe(idSelect, addOnChangeEventListener(onSettingChanged)));

// REDUX

// ACTIONS TYPES

const CHANGE_PATH = "CHANGE_PATH";
const CHANGE_ANIMATION = "CHANGE_ANIMATION";

// ACTIONS CREATORS

const changePath = (project, scaleX, scaleY, locked, analysis) => ({
  type: CHANGE_PATH,
  path: { project, scaleX, scaleY, locked, analysis }
});

const changeAnimation = animation => ({
  type: CHANGE_ANIMATION,
  animation
});

// REDUCERS

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

const toggleError = message => {
  const errorP = document.querySelector(".error");

  if (message) {
    errorP.innerHTML = message;
    errorP["style"].display = "block";
  } else {
    errorP["style"].display = "none";
  }
};

const handleChange = async () => {
  // @ts-ignore
  const { animation, lastAction, path } = store.getState();

  toggleError(false);

  if (lastAction === CHANGE_PATH && path.project) {
    try {
      const {
        timeEstimation,
        simulation,
        boundingBox,
        cutLength,
        engraveLength,
        travelLength
      } = path.analysis;

      if (simulation?.length === 0) {
        toggleError(
          "We didn't find any cutting or engraving paths. Are you sure you specified the right colors?"
        );
      }

      /** @type {HTMLInputElement} */ (idSelect("project-width")).value = boundingBox.width.toFixed(
        0
      );
      /** @type {HTMLInputElement} */ (idSelect(
        "project-height"
      )).value = boundingBox.height.toFixed(0);

      idSelect("time-estimation").innerText = `${(timeEstimation / 60).toFixed(0)} min. ${(timeEstimation % 60).toFixed(0)} sec.`;
      idSelect("cut-distance").innerText = `${cutLength.toFixed(0)} mm`;
      idSelect("engrave-distance").innerText = `${engraveLength.toFixed(0)} mm`;
      idSelect("travel-distance").innerText = `${travelLength.toFixed(0)} mm`;

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
    } catch (error) {
      console.log(error);
      toggleError(error);
    }
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

// PATH DISPATCHER

const fileUploadInputId = "file-upload";

const onFileUpload = async e => {
  const {
    path: { locked, scaleX, scaleY }
  } = store.getState();

  /**@type {File} */
  const file = e.target.files[0];

  if (!file) return;

  idSelect("time-estimation").innerText = "--- min.";
  idSelect("loader").style.visibility = "visible";

  try {
    const text = await file.text();
    const format = file.name.split(".").pop();
    const settings = getSettings();

    const project = await sdk.parseFile(text, format);
    const analysis = await sdk.analyzeProject(project, settings, true);

    store.dispatch(changePath(project, scaleX, scaleY, locked, analysis));
  } catch (error) {
    console.log(error);
    toggleError(error);
    idSelect("loader").style.visibility = "hidden";
  }

  e.target.value = "";
  /**@type {HTMLSpanElement}*/ (idSelect("file-upload-name")).textContent = file.name;
};

// @ts-ignore
R.pipe(idSelect, addOnChangeEventListener(onFileUpload))(fileUploadInputId);

const onWidthOrHeightChange = async e => {
  const {
    path: { project, scaleX, scaleY, locked, analysis }
  } = store.getState();

  const value = Math.max(parseFloat(e.target.value), 1);
  e.target.value = value;

  const newWidth =
    e.target.id === "project-width"
      ? value
      : locked
      ? (value / analysis?.boundingBox?.height) * analysis?.boundingBox?.width
      : analysis?.boundingBox?.width;
  const newHeight =
    e.target.id === "project-height"
      ? value
      : locked
      ? (value / analysis?.boundingBox?.width) * analysis?.boundingBox?.height
      : analysis?.boundingBox?.height;

  const newScaleX = newWidth / (analysis?.boundingBox?.width / scaleX);
  const newScaleY = newHeight / (analysis?.boundingBox?.height / scaleY);

  const parser = new DOMParser();
  const doc = parser.parseFromString(project, "image/svg+xml");

  const projectGroup = doc.getElementById("project-group");

  if (projectGroup) projectGroup.setAttribute("transform", `scale(${newScaleX}, ${newScaleY})`);

  const serializer = new XMLSerializer();
  const newProject = serializer.serializeToString(doc);

  const settings = getSettings();

  idSelect("time-estimation").innerText = "--- min.";
  idSelect("loader").style.visibility = "visible";

  const newAnalysis = await sdk.analyzeProject(newProject, settings, true);

  store.dispatch(changePath(newProject, newScaleX, newScaleY, locked, newAnalysis));
};

const fileWidthAndHeightSettings = ["project-width", "project-height"];
fileWidthAndHeightSettings.map(R.pipe(idSelect, addOnChangeEventListener(onWidthOrHeightChange)));

const onLockClicked = () => {
  const {
    path: { project, scaleX, scaleY, locked, analysis }
  } = store.getState();

  const newLocked = !locked;

  idSelect("lock-on").style.visibility = newLocked ? "visible" : "hidden";
  idSelect("lock-off").style.visibility = newLocked ? "hidden" : "visible";

  store.dispatch(changePath(project, scaleX, scaleY, newLocked, analysis));
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
  animationHandler.zoom(-e.deltaY * 0.0005);
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
