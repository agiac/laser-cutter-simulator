function toZero(n, precision = 0.000001) {
  if (Math.abs(n) < precision) return 0;
  return n;
}

function approxEqual(a, b, precision = 0.000001) {
  return Math.abs(a - b) <= precision;
}

function approxGreater(a, b, precision = 0.000001) {
  return a - b > precision;
}

function approxGreateOrEqual(a, b, precision = 0.000001) {
  return approxGreater(a, b) || approxEqual(a, b);
}

function maxForcePerDirection(maxForceX, maxForceY, unitVector) {
  return Math.min(
    Math.abs(maxForceX / unitVector.x) || 1000000000,
    Math.abs(maxForceY / unitVector.y) || 1000000000
  );
}

//From https://github.com/gnea/grbl/blob/master/grbl/planner.c#L407
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

function calculateSpeedIncrease(startPosition, targetPosition, settings) {
  const startToTargetVector = targetPosition.sub(startPosition);
  const startToTargetDirection = startToTargetVector.unit();

  const acceleration = maxForcePerDirection(
    settings.accelerationX,
    settings.accelerationY,
    startToTargetDirection
  );
  const displacement = startToTargetVector.mag();

  return Math.sqrt(2 * acceleration * displacement);
}

function canReachTargetSpeed(
  startPosition,
  desiredStartSpeed,
  targetPosition,
  targetSpeed,
  settings
) {
  const speedIncrease = calculateSpeedIncrease(
    startPosition,
    targetPosition,
    settings
  );

  return approxGreateOrEqual(
    speedIncrease,
    Math.abs(desiredStartSpeed - targetSpeed)
  );
}

function calculateMaxSpeedToReachTargetSpeed(
  startPosition,
  targetPosition,
  targetSpeed,
  settings
) {
  const speedIncrease = calculateSpeedIncrease(
    startPosition,
    targetPosition,
    settings
  );

  return targetSpeed + speedIncrease;
}

function junctionSpeedPoint(position, finalSpeed, maxSpeed) {
  return {
    position,
    finalSpeed,
    maxSpeed
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

    const maxSpeed = Math.min(
      path[i].desiredSpeed,
      maxForcePerDirection(
        settings.maximumSpeedX,
        settings.maximumSpeedY,
        next.position.sub(current.position).unit()
      )
    );
    const desiredFinalSpeed = Math.min(current.maxJunctionSpeed, maxSpeed);

    if (
      canReachTargetSpeed(
        current.position,
        desiredFinalSpeed,
        next.position,
        next.finalSpeed,
        settings
      )
    ) {
      junctionSpeeds.push(
        junctionSpeedPoint(current.position, desiredFinalSpeed, maxSpeed)
      );
    } else if (desiredFinalSpeed >= next.finalSpeed) {
      const maxSpeedToReachTargetSpeed = calculateMaxSpeedToReachTargetSpeed(
        current.position,
        next.position,
        next.finalSpeed,
        settings
      );

      junctionSpeeds.push(
        junctionSpeedPoint(
          current.position,
          maxSpeedToReachTargetSpeed,
          maxSpeed
        )
      );
    } else {
      alert(
        "Oh no, looks like you hit the only unhandled scenario! Take a screenshot and let Alberto know."
      );

      break;

      //TODO Recalc previous points speed
    }
  }

  return junctionSpeeds.reverse();
}

function speedPoint(start, target, speed, acceleration) {
  return {
    start,
    target,
    speed,
    acceleration
  };
}

function planSegment(start, target, settings) {
  const startToTarget = target.position.sub(start.position);
  const directionToTarget = startToTarget.unit();

  const accelerationToTarget = maxForcePerDirection(
    settings.accelerationX,
    settings.accelerationY,
    directionToTarget
  );

  const speedToTarget = target.maxSpeed;

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

    point1 = speedPoint(
      start.position,
      point2Position,
      start.speed,
      accelerationToTarget
    );
    point2 = speedPoint(point2Position, point3Position, speedToTarget, 0);
    point3 = speedPoint(
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

    if (
      startToPoint2Distance > startToTarget.mag() ||
      startToPoint2Distance < 0
    ) {
      point1 = speedPoint(
        start.position,
        target.position,
        start.speed,
        start.speed > target.finalSpeed ? -1 : 1 * accelerationToTarget
      );
      return [point1];
    } else {
      point1 = speedPoint(
        start.position,
        point2Position,
        start.speed,
        accelerationToTarget
      );
      point2 = speedPoint(
        point2Position,
        target.position,
        point2Speed,
        -accelerationToTarget
      );
      return [point1, point2];
    }
  }
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
    const distance = direction.mag();
    const finalSpeed = Math.sqrt(
      toZero(Math.pow(curr.speed, 2) + 2 * curr.acceleration * distance)
    );
    const time = (2 * distance) / (curr.speed + finalSpeed);
    return prev + time;
  }, 0);
}
