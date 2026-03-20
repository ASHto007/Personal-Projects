const express = require("express");

const {
  completeCurrentInnings,
  createMatch,
  getCurrentMatchDetails,
  getRecentMatchResults,
  startSecondInnings,
  undoLastBall,
  updateCurrentMatchPlayers,
  updateCurrentMatchScore,
} = require("../controllers/matchController");

const router = express.Router();

router.post("/", createMatch);
router.get("/current", getCurrentMatchDetails);
router.get("/recent", getRecentMatchResults);
router.post("/current/innings/complete", completeCurrentInnings);
router.post("/current/innings/start-second", startSecondInnings);
router.patch("/current/players", updateCurrentMatchPlayers);
router.patch("/current/score", updateCurrentMatchScore);
router.post("/current/score/undo", undoLastBall);

module.exports = router;
