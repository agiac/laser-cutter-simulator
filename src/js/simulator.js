import Vector from "./vector";

function maxForcePerDirection(maxForceX, maxForceY, unitVector) {
  return Math.min(
    Math.abs(maxForceX / unitVector.x) || 1000000000,
    Math.abs(maxForceY / unitVector.y) || 1000000000
  );
}

/**
 *
 * From https://github.com/gnea/grbl/blob/master/grbl/planner.c#L407
 * @param {Vector} uV1 Unit vector
 * @param {Vector} uV2 Unit vector
 * @returns {Number}
 */
function calcMaxJunctionSpeed(uV1, uV2, settings) {
  //TODO add in advanced settings minimumJunctionSpeed and junctionDeviation
  const minimumJunctionSpeed = 0;
  const junctionDeviation = 0.01;

  const junction_cos_theta = -uV1.x * uV2.x - uV1.y * uV2.y;
  const junction_unit_vec = uV2.sub(uV1).unit();

  if (junction_cos_theta > 0.999999) {
    //  For a 0 degree acute junction, just set minimum junction speed.
    return minimumJunctionSpeed;
  } else {
    if (junction_cos_theta < -0.999999) {
      // Junction is a straight line or 180 degrees. Junction speed is infinite.
      return 1000000000;
    } else {
      const junction_acceleration = maxForcePerDirection(
        settings.accelerationX,
        settings.accelerationY,
        junction_unit_vec
      );
      const sin_theta_d2 = Math.sqrt(0.5 * (1.0 - junction_cos_theta));
      return Math.max(
        minimumJunctionSpeed * minimumJunctionSpeed,
        Math.sqrt(
          (junction_acceleration * junctionDeviation * sin_theta_d2) /
            (1.0 - sin_theta_d2)
        )
      );
    }
  }
}

function calculateMaximumJunctionSpeeds(path, settings, start) {
  var p0, p1, p2;
  var result = [];

  p0 = start;

  for (var i = 0; i < path.length - 1; i++) {
    p1 = path[i].position;
    p2 = path[i + 1].position;
    const maxJunctionSpeed = toZero(
      calcMaxJunctionSpeed(p1.sub(p0).unit(), p2.sub(p1).unit(), settings)
    );
    result.push({
      position: p1,
      maxJunctionSpeed
    });
    p0 = p1;
  }

  result.push({
    position: path[path.length - 1].position,
    maxJunctionSpeed: 0
  });

  return result;
}
/**
 *
 * @param {Vector} startPosition
 * @param {Number} startSpeed
 * @param {Vector} targetPosition
 * @param {Number} targetSpeed
 */
function canReachTargetSpeed(
  startPosition,
  startSpeed,
  targetPosition,
  targetSpeed,
  settings
) {
  const startToTargetVector = targetPosition.sub(startPosition);
  const acceleration = maxForcePerDirection(
    settings.accelerationX,
    settings.accelerationY,
    startToTargetVector.unit()
  );
  const maxSpeed = maxForcePerDirection(
    settings.maximumSpeedX,
    settings.maximumSpeedY,
    startToTargetVector.unit()
  );
  const displacement = startToTargetVector.mag();
  const finalMaxSpeed = Math.sqrt(2 * acceleration * displacement);

  return (
    Math.min(finalMaxSpeed, maxSpeed) >=
    Math.abs(Math.min(startSpeed, maxSpeed) - Math.min(targetSpeed, maxSpeed))
  );
}

function calcMaxSpeedToReachTargetSpeed(
  startPosition,
  targetPosition,
  targetSpeed,
  settings,
  decelerate
) {
  const startToTargetVector = targetPosition.sub(startPosition);
  const acceleration = maxForcePerDirection(
    settings.accelerationX,
    settings.accelerationY,
    startToTargetVector.unit()
  );
  const maxSpeed = maxForcePerDirection(
    settings.maximumSpeedX,
    settings.maximumSpeedY,
    startToTargetVector.unit()
  );
  const displacement = startToTargetVector.mag();
  const result = Math.sqrt(
    Math.pow(Math.min(targetSpeed, maxSpeed), 2) -
      2 * (decelerate ? -1 : 1) * acceleration * displacement
  );
  if (!result) {
    console.log("nnnnnnnnnnnnnn");
  }
  return result;
}

function calculateTargetSpeeds(path, settings, start) {
  const maxJunctionSpeeds = calculateMaximumJunctionSpeeds(
    path,
    settings,
    start
  );

  const resultPoint = (position, finalSpeed, maxSpeed) => ({
    position,
    finalSpeed,
    maxSpeed
  });

  const result = [];
  result.push(
    resultPoint(
      maxJunctionSpeeds[maxJunctionSpeeds.length - 1].position,
      maxJunctionSpeeds[maxJunctionSpeeds.length - 1].maxJunctionSpeed,
      path[path.length - 1].desiredSpeed
    )
  );

  for (var i = maxJunctionSpeeds.length - 2; i >= 0; i--) {
    const next = maxJunctionSpeeds[i + 1];
    const current = maxJunctionSpeeds[i];

    //Check if the current point max junction speed allows the reach of the previous point speed
    if (
      canReachTargetSpeed(
        current.position,
        current.maxJunctionSpeed,
        next.position,
        next.maxJunctionSpeed,
        settings
      )
    ) {
      if (
        !Math.min(
          current.maxJunctionSpeed,
          path[i].desiredSpeed,
          maxForcePerDirection(
            settings.maximumSpeedX,
            settings.maximumSpeedY,
            next.position.sub(current.position).unit()
          )
        )
      ) {
        console.log("ZZZZZZZZZZZZZZ");
      }

      result.push(
        resultPoint(
          current.position,
          Math.min(
            current.maxJunctionSpeed,
            path[i].desiredSpeed,
            maxForcePerDirection(
              settings.maximumSpeedX,
              settings.maximumSpeedY,
              next.position.sub(current.position).unit()
            )
          ),
          path[i].desiredSpeed
        )
      );
    } else {
      const maxSpeedToReachTargetSpeed = calcMaxSpeedToReachTargetSpeed(
        current.position,
        next.position,
        next.maxJunctionSpeed,
        settings,
        current.maxJunctionSpeed > next.maxJunctionSpeed
      );

      if (maxSpeedToReachTargetSpeed >= 0) {
        if (!maxSpeedToReachTargetSpeed) {
          console.log("llllllllllllllllllllll");
        }

        result.push(
          resultPoint(
            current.position,
            maxSpeedToReachTargetSpeed,
            path[i].desiredSpeed
          )
        );
      } else {
        console.log("OH SNAP...");
      }
    }
  }

  return result.reverse();
  // var p0, p1, p2;
  // var result = [];

  // p0 = start;

  // for (var i = 0; i < path.length - 1; i++) {
  //   p1 = path[i].position;
  //   p2 = path[i + 1].position;
  //   const maxJunctionSpeed = toZero(
  //     calcMaxJunctionSpeed(p1.sub(p0).unit(), p2.sub(p1).unit(), settings)
  //   );
  //   result.push({
  //     position: p1,
  //     finalSpeed: 0,
  //     maxSpeed: path[i].desiredSpeed
  //   });
  //   p0 = p1;
  // }

  // result.push({
  //   position: path[path.length - 1].position,
  //   finalSpeed: 0,
  //   maxSpeed: path[path.length - 1].desiredSpeed
  // });

  // return result;

  // return path.map(({ position, desiredSpeed }) => ({
  //   position,
  //   finalSpeed: 0,
  //   maxSpeed: desiredSpeed
  // }));
}

function makeSpeedPoint(start, target, speed, acceleration) {
  return {
    start,
    target,
    speed,
    acceleration
  };
}

function planSegment(start, target, settings) {
  const {
    maximumSpeedX,
    maximumSpeedY,
    accelerationX,
    accelerationY
  } = settings;

  const startToTarget = target.position.sub(start.position);
  const directionToTarget = startToTarget.unit();

  const accelerationToTarget = maxForcePerDirection(
    accelerationX,
    accelerationY,
    directionToTarget
  );
  const speedToTarget = Math.min(
    maxForcePerDirection(maximumSpeedX, maximumSpeedY, directionToTarget),
    target.maxSpeed
  );

  var startToPoint2Distance =
    (Math.pow(speedToTarget, 2) - Math.pow(start.speed, 2)) /
    (2 * accelerationToTarget);
  var point3ToTargetDistance =
    (Math.pow(target.finalSpeed, 2) - Math.pow(speedToTarget, 2)) /
    (2 * -accelerationToTarget);

  var point2Position, point3Position;
  var point1, point2, point3;

  if (startToPoint2Distance + point3ToTargetDistance < startToTarget.mag()) {
    point2Position = start.position.add(
      directionToTarget.scale(startToPoint2Distance)
    );
    point3Position = target.position.sub(
      directionToTarget.scale(point3ToTargetDistance)
    );

    if (!point2Position.x || !point3Position.x || !target.position.x) {
      console.log("HDFOISD");
    }

    point1 = makeSpeedPoint(
      start.position,
      point2Position,
      start.speed,
      accelerationToTarget
    );
    point2 = makeSpeedPoint(
      point2Position,
      point3Position,
      speedToTarget,
      0
    );
    point3 = makeSpeedPoint(
      point3Position,
      target.position,
      speedToTarget,
      -accelerationToTarget
    );

    return [point1, point2, point3];
  } else {
    //https://math.stackexchange.com/questions/53698/determining-the-peak-speed-of-an-accelerating-decelerating-body-between-two-poin
    const point2Speed = Math.sqrt(
      accelerationToTarget * startToTarget.mag() +
        (Math.pow(start.speed, 2) + Math.pow(target.finalSpeed, 2)) / 2
    );
    startToPoint2Distance =
      (Math.pow(point2Speed, 2) - Math.pow(start.speed, 2)) /
      (2 * accelerationToTarget);
    point2Position = start.position.add(
      directionToTarget.scale(startToPoint2Distance)
    );

    if (!point2Position.x || !target.position.x) {
      console.log(startToPoint2Distance, point2Speed, start.speed, accelerationToTarget);
    }

    point1 = makeSpeedPoint(
      start.position,
      point2Position,
      start.speed,
      accelerationToTarget
    );
    point2 = makeSpeedPoint(
      point2Position,
      target.position,
      point2Speed,
      -accelerationToTarget
    );

    return [point1, point2];
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
