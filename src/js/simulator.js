import Vector from "./vector";

function maxForcePerDirection(maxForceX, maxForceY, unitVector) {
  return Math.min(
    Math.abs(maxForceX / unitVector.x) || 1000000000,
    Math.abs(maxForceY / unitVector.y) || 1000000000
  );
}

/**
 * From https://github.com/gnea/grbl/blob/master/grbl/planner.c#L407
 * @param {Vector} v1
 * @param {Vector} v2
 * @returns {number}
 */
function calculateMaxJunctionSpeed(v1, v2, settings) {
  const { minimumJunctionSpeed, junctionDeviation } = settings;

  const uV1 = v1.unit();
  const uV2 = v2.unit();

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
      calculateMaxJunctionSpeed(p1.sub(p0), p2.sub(p1), settings)
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

function calculateAccelerationMaxSpeedAndDisplacement(
  startPosition,
  targetPosition,
  desiredSpeed,
  settings
) {
  const startToTargetVector = targetPosition.sub(startPosition);
  const startToTargetDirection = startToTargetVector.unit();

  const acceleration = maxForcePerDirection(
    settings.accelerationX,
    settings.accelerationY,
    startToTargetDirection
  );
  const maxSpeed = Math.min(
    maxForcePerDirection(
      settings.maximumSpeedX,
      settings.maximumSpeedY,
      startToTargetDirection
    ),
    desiredSpeed
  );
  const displacement = startToTargetVector.mag();

  return [acceleration, maxSpeed, displacement];
}

function canReachTargetSpeed(
  startPosition,
  startSpeed,
  targetPosition,
  targetSpeed,
  desiredSpeed,
  settings
) {
  const [
    acceleration,
    maxSpeed,
    displacement
  ] = calculateAccelerationMaxSpeedAndDisplacement(
    startPosition,
    targetPosition,
    desiredSpeed,
    settings
  );

  const finalMaxSpeed = Math.sqrt(2 * acceleration * displacement);

  return (
    Math.min(finalMaxSpeed, maxSpeed) >=
    Math.abs(Math.min(startSpeed, maxSpeed) - Math.min(targetSpeed, maxSpeed))
  );
}

function calculateMaxSpeedToReachTargetSpeed(
  startPosition,
  targetPosition,
  targetSpeed,
  desiredSpeed,
  settings,
  decelerate
) {
  const [
    acceleration,
    maxSpeed,
    displacement
  ] = calculateAccelerationMaxSpeedAndDisplacement(
    startPosition,
    targetPosition,
    desiredSpeed,
    settings
  );

  const result = Math.sqrt(
    Math.pow(Math.min(targetSpeed, maxSpeed), 2) -
      2 * (decelerate ? -1 : 1) * acceleration * displacement
  );
  return result;
}

function junctionSpeedPoint(position, finalSpeed, desiredSpeed) {
  return {
    position,
    finalSpeed,
    desiredSpeed
  };
}

function calculateJunctionSpeeds(path, settings, start) {
  const maxJunctionSpeeds = calculateMaximumJunctionSpeeds(
    path,
    settings,
    start
  );

  const junctionSpeeds = [];

  junctionSpeeds.push(
    junctionSpeedPoint(
      maxJunctionSpeeds[maxJunctionSpeeds.length - 1].position,
      maxJunctionSpeeds[maxJunctionSpeeds.length - 1].maxJunctionSpeed,
      path[path.length - 1].desiredSpeed
    )
  );

  for (var i = maxJunctionSpeeds.length - 2; i >= 0; i--) {
    const next = junctionSpeeds[junctionSpeeds.length - 1];
    const current = maxJunctionSpeeds[i];

    const desiredSpeed = path[i].desiredSpeed;
    const maxSpeedPerDirection = maxForcePerDirection(
      settings.maximumSpeedX,
      settings.maximumSpeedY,
      next.position.sub(current.position).unit()
    );

    //Check if the current point max junction speed allows the reach of the next point speed
    if (
      canReachTargetSpeed(
        current.position,
        current.maxJunctionSpeed,
        next.position,
        next.finalSpeed,
        desiredSpeed,
        settings
      )
    ) {
      junctionSpeeds.push(
        junctionSpeedPoint(
          current.position,
          Math.min(
            current.maxJunctionSpeed,
            desiredSpeed,
            maxSpeedPerDirection
          ),
          desiredSpeed //TODO Maybe we could put here already the final maxSpeed as min(desiredSpeed, maxSpeedPerDirection) ?!?!?!?!
        )
      );
    } else {
      const maxSpeedToReachTargetSpeed = calculateMaxSpeedToReachTargetSpeed(
        current.position,
        next.position,
        next.finalSpeed,
        desiredSpeed,
        settings,
        current.maxJunctionSpeed > next.finalSpeed
      );

      if (
        maxSpeedToReachTargetSpeed >= 0 &&
        !isNaN(maxSpeedToReachTargetSpeed)
      ) {
        //WHAT IF maxSpeedToReachTargetSpeed IS HIGHER THAN MAXFORCEPERDIRECTION ???
        junctionSpeeds.push(
          junctionSpeedPoint(
            current.position,
            Math.min(
              maxSpeedToReachTargetSpeed,
              desiredSpeed,
              maxSpeedPerDirection
            ),
            desiredSpeed
          )
        );
      } else {
        console.log("OH SNAP...");
      }
    }
  }

  return junctionSpeeds.reverse();
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
    target.desiredSpeed
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

    point1 = makeSpeedPoint(
      start.position,
      point2Position,
      start.speed,
      accelerationToTarget
    );
    point2 = makeSpeedPoint(point2Position, point3Position, speedToTarget, 0);
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
  const junctionSpeeds = calculateJunctionSpeeds(path, settings, startPosition);

  var result = [];
  var start = { position: startPosition, speed: 0 };

  junctionSpeeds.forEach(junction => {
    result.push(...planSegment(start, junction, settings));
    start = { position: junction.position, speed: junction.finalSpeed };
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
