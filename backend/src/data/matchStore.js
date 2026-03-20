let currentMatch = null;
let recentMatches = [];

const MAX_RECENT_MATCHES = 8;

function setCurrentMatch(match) {
  currentMatch = match;
  return currentMatch;
}

function getCurrentMatch() {
  return currentMatch;
}

function upsertRecentMatch(match) {
  const sanitizedMatch = JSON.parse(JSON.stringify(match));
  recentMatches = [
    sanitizedMatch,
    ...recentMatches.filter((existingMatch) => existingMatch.id !== sanitizedMatch.id),
  ].slice(0, MAX_RECENT_MATCHES);

  return recentMatches;
}

function getRecentMatches() {
  return recentMatches;
}

module.exports = {
  getRecentMatches,
  setCurrentMatch,
  getCurrentMatch,
  upsertRecentMatch,
};
