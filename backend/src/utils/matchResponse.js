function sanitizeMatch(match) {
  if (!match) {
    return null;
  }

  const { history, ...safeMatch } = match;
  return safeMatch;
}

module.exports = {
  sanitizeMatch,
};
