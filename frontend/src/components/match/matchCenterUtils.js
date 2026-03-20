export function getCurrentInnings(match) {
  return match?.innings?.find((innings) => innings.number === match.currentInnings) || null;
}

export function getDisplayInnings(match) {
  const currentInnings = getCurrentInnings(match);

  if (!currentInnings) {
    return null;
  }

  if (currentInnings.status === "live" || currentInnings.status === "complete") {
    return currentInnings;
  }

  return (
    [...(match?.innings || [])]
      .reverse()
      .find((innings) => innings.status === "live" || innings.status === "complete") || currentInnings
  );
}

export function getTotalExtras(score) {
  if (!score?.extras) {
    return 0;
  }

  return (
    score.extras.wides +
    score.extras.noBalls +
    score.extras.byes +
    score.extras.legByes
  );
}

export function getStatusLabel(status) {
  if (status === "live") {
    return "Live";
  }

  if (status === "innings-break") {
    return "Innings Break";
  }

  if (status === "completed") {
    return "Match Complete";
  }

  return status || "Loading";
}

export function getRunRate(innings) {
  if (!innings?.score?.balls) {
    return "0.00";
  }

  return (innings.score.runs / (innings.score.balls / 6)).toFixed(2);
}

export function getRequiredRate(match, innings) {
  if (!match?.target || !innings?.target || !innings?.score) {
    return null;
  }

  const remainingRuns = innings.target - innings.score.runs;
  const remainingBalls = match.overs * 6 - innings.score.balls;

  if (remainingRuns <= 0) {
    return "0.00";
  }

  if (remainingBalls <= 0) {
    return "-";
  }

  return ((remainingRuns / remainingBalls) * 6).toFixed(2);
}

export function getLeadingBatter(innings) {
  if (!innings?.battingCard?.length) {
    return null;
  }

  return [...innings.battingCard].sort((left, right) => right.runs - left.runs)[0];
}

export function getLeadingBowler(innings) {
  if (!innings?.bowlingCard?.length) {
    return null;
  }

  return [...innings.bowlingCard].sort((left, right) => {
    if (right.wickets !== left.wickets) {
      return right.wickets - left.wickets;
    }

    return left.runs - right.runs;
  })[0];
}

export function getBatterEntry(innings, batterName) {
  if (!innings?.battingCard?.length || !batterName) {
    return null;
  }

  return innings.battingCard.find((player) => player.name === batterName) || null;
}

export function getBowlerEntry(innings, bowlerName) {
  if (!innings?.bowlingCard?.length || !bowlerName) {
    return null;
  }

  return innings.bowlingCard.find((player) => player.name === bowlerName) || null;
}

export function getStrikeRate(player) {
  if (!player?.balls) {
    return "0.00";
  }

  return ((player.runs / player.balls) * 100).toFixed(2);
}

export function getEconomyRate(player) {
  if (!player?.balls) {
    return "0.00";
  }

  return ((player.runs / player.balls) * 6).toFixed(2);
}

export function getRemainingBalls(match, innings) {
  if (!match?.overs || !innings?.score) {
    return 0;
  }

  return Math.max(match.overs * 6 - innings.score.balls, 0);
}

export function getTargetStatus(match, innings) {
  if (!match?.target || !innings?.score) {
    return null;
  }

  const remainingRuns = match.target - innings.score.runs;
  const remainingBalls = getRemainingBalls(match, innings);

  if (remainingRuns <= 0) {
    return `${innings.battingTeam} are ahead`;
  }

  if (remainingBalls <= 0) {
    return `${remainingRuns} needed`;
  }

  return `${remainingRuns} needed from ${remainingBalls} balls`;
}
