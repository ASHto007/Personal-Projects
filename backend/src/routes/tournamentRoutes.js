const express = require("express");

const {
  createTournament,
  getTournamentDetails,
  listTournaments,
  updateFixtureResult,
} = require("../controllers/tournamentController");

const router = express.Router();

router.get("/", listTournaments);
router.post("/", createTournament);
router.get("/:tournamentId", getTournamentDetails);
router.patch("/:tournamentId/fixtures/:fixtureId", updateFixtureResult);

module.exports = router;
