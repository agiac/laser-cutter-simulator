import Vector from "./vector";

export function plan(path, settings, start) {
  //Each points of the path has {location, desiredSpeed}. Settings have {maxSpeedXY, accelerationXY}
  var res = [];
  var current = start;
  for (var i = 0; i < path.length; i++) {
    const target = path[i].position;
    const targetSpeed = path[i].desiredSpeed;
    res.push({
      start: current,
      target: target,
      speed: targetSpeed,
      acceleration: 0
    });
    current = target;
  }
  return res
} //return list of speed points ({position, direction, speed, acceleration} along the path)

export function estimateTime(speedPoints) {} //return estimated total time
