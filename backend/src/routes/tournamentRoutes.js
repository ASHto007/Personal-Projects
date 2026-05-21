const express = require("express");

const {
  addTournamentTeams,
  createTournament,
  createTournamentGroups,
  getTournamentDetails,
  listTournaments,
  startTournamentSchedule,
  updateTeamSquad,
  updateTournamentAwards,
  updateFixtureResult,
} = require("../controllers/tournamentController");

const router = express.Router();

router.get("/", listTournaments);
router.post("/", createTournament);
router.patch("/:tournamentId/teams", addTournamentTeams);
router.patch("/:tournamentId/teams/:teamId/squad", updateTeamSquad);
router.patch("/:tournamentId/groups", createTournamentGroups);
router.patch("/:tournamentId/schedule", startTournamentSchedule);
router.patch("/:tournamentId/awards", updateTournamentAwards);
router.get("/:tournamentId", getTournamentDetails);
router.patch("/:tournamentId/fixtures/:fixtureId", updateFixtureResult);

module.exports = router;
