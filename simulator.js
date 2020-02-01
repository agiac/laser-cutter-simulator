import Vector from "./vector";

function calculateTargetSpeeds(path, settings, start) {
  return path.map(({ position, desiredSpeed }) => ({
    position,
    targetSpeed: 100
  }));
}

function planSegment(start, target, settings) {
  //1 Find deceleration point
  //2 Find stop accelerating point
  return [
    {
      start: start.position,
      target: target.position,
      speed: target.targetSpeed,
      acceleration: 0
    }
  ];
}

export function plan(path, settings, startPosition) {
  const targetSpeeds = calculateTargetSpeeds(path, settings, start);

  var result = [];
  var start = { position: startPosition, speed: 0 };

  targetSpeeds.forEach(target => {
    result.push(...planSegment(start, target, settings));
    start = { position: target.position, speed: target.targetSpeed };
  });

  return result;
}

export function estimateTime(speedPoints) {}
