import Vector from "./vector";

const maxForcePerDirection = (maxForceX, maxForceY, direction) => {
  if (Math.abs(direction.y / direction.x) > Math.abs(maxForceY / maxForceX)) {
    return Math.abs(maxForceY / direction.y);
  } else {
    return Math.abs(maxForceX / direction.x);
  }
};

function calculateTargetSpeeds(path, settings, start) {
  return path.map(({ position, desiredSpeed }) => ({
    position,
    finalSpeed: 0,
    maxSpeed: desiredSpeed,
  }));
}

function planSegment(start, target, settings) {
  const makeSpeedPoint = (start, target, speed, acceleration) => ({
    start,
    target,
    speed,
    acceleration
  });

  const {
    maximumSpeedX,
    maximumSpeedY,
    accelerationX,
    accelerationY,
  } = settings;

  const startToTarget = target.position.sub(start.position);
  const directionToTarget = startToTarget.unit();

  const accelerationToTarget = maxForcePerDirection(
    accelerationX,
    accelerationY,
    directionToTarget
  );
  const maxSpeedToTarget = maxForcePerDirection(
    maximumSpeedX,
    maximumSpeedY,
    directionToTarget
  );
  const speedToTarget = Math.min(maxSpeedToTarget, target.maxSpeed);

  const startToPoint1Distance =
    (Math.pow(speedToTarget, 2) - Math.pow(start.speed, 2)) /
    (2 * accelerationToTarget);
  const point2ToTargetDistance =
    (Math.pow(target.finalSpeed, 2) - Math.pow(speedToTarget, 2)) /
    (2 * -accelerationToTarget);

  if (startToPoint1Distance + point2ToTargetDistance < startToTarget.mag()) {
    const point2Position = start.position.add(
      directionToTarget.scale(startToPoint1Distance)
    );
    const point3Position = target.position.sub(
      directionToTarget.scale(point2ToTargetDistance)
    );

    const point1 = makeSpeedPoint(
      start.position,
      point2Position,
      start.speed,
      accelerationToTarget
    );
    const point2 = makeSpeedPoint(
      point2Position,
      point3Position,
      speedToTarget,
      0
    );
    const point3 = makeSpeedPoint(
      point3Position,
      target.position,
      speedToTarget,
      -accelerationToTarget
    );

    return [point1, point2, point3];
  } else {
    console.log(
      "NO",
      speedToTarget,
      accelerationToTarget,
      startToPoint1Distance,
      point2ToTargetDistance,
      startToTarget.mag(),
      accelerationX,
      accelerationY
    );
  }
}

function toZero(n, precision = 0.000001) {
  if (Math.abs(n) < precision) return 0;
  return n;
}

export function plan(path, settings, startPosition) {
  const targetSpeeds = calculateTargetSpeeds(path, settings, startPosition);

  var result = [];
  var start = { position: startPosition, speed: 0 };

  targetSpeeds.forEach(target => {
    result.push(...planSegment(start, target, settings));
    start = { position: target.position, speed: target.finalSpeed };
  });

  return result;
}

export function estimateTime(speedPoints) {
  return speedPoints.reduce((prev, curr) => {
    const direction = curr.target.sub(curr.start);
    const dist = direction.mag();
    const finalSpeed = Math.sqrt(
      toZero(Math.pow(curr.speed, 2) + 2 * curr.acceleration * dist)
    );
    const time = (2 * dist) / (curr.speed + finalSpeed);
    return prev + time;
  }, 0);
}
