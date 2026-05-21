import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  addTournamentTeams,
  createTournament,
  createTournamentGroups,
  listTournaments,
  startTournamentSchedule,
  updateTournamentAwards,
  updateTournamentTeamSquad,
  updateFixtureResult,
} from "../services/tournamentService";
import tournamentHero from "../assets/tournament-hero.png";
import RoleNav from "../components/RoleNav";
import TournamentTabs from "../components/tournament/TournamentTabs";

function formatDisplayDate(value) {
  if (!value) {
    return "Date TBA";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TournamentPage({ mode = "viewer" }) {
  const isAdmin = mode === "admin";
  const [tournaments, setTournaments] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    format: "ODI",
    overs: "50",
    venue: "",
    startDate: "",
    endDate: "",
    logoUrl: "",
  });
  const [groupSetup, setGroupSetup] = useState({
    groupCount: 2,
    groupNames: "Group A, Group B",
  });
  const [teamSetup, setTeamSetup] = useState({
    teams: "",
  });
  const [squadSetup, setSquadSetup] = useState({
    teamId: "",
    players: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTournaments({ silent = false } = {}) {
      try {
        const response = await listTournaments();

        if (isMounted) {
          setTournaments(response);
          if (!silent) {
            setErrorMessage("");
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load tournaments.");
        }
      }
    }

    loadTournaments();

    const intervalId = window.setInterval(() => {
      loadTournaments({ silent: true });
    }, isAdmin ? 12000 : 18000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAdmin]);

  const activeTournament = tournaments.find((tournament) => tournament.status === "active") || null;
  const selectedTournament = activeTournament || tournaments[0] || null;
  const canCreateTournament = isAdmin && !activeTournament;

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentValue) => ({
      ...currentValue,
      [name]: value,
    }));
  }

  function handleGroupSetupChange(event) {
    const { name, value } = event.target;

    setGroupSetup((currentValue) => ({
      ...currentValue,
      [name]: name === "groupCount" ? Number(value) : value,
    }));
  }

  function handleTeamSetupChange(event) {
    const { name, value } = event.target;

    setTeamSetup((currentValue) => ({
      ...currentValue,
      [name]: value,
    }));
  }

  function handleSquadSetupChange(event) {
    const { name, value } = event.target;

    setSquadSetup((currentValue) => ({
      ...currentValue,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await createTournament(formData);
      setTournaments([response]);
      setFormData({
        name: "",
        format: "ODI",
        overs: "50",
        venue: "",
        startDate: "",
        endDate: "",
        logoUrl: "",
      });
      setGroupSetup({
        groupCount: 2,
        groupNames: "Group A, Group B",
      });
      setTeamSetup({ teams: "" });
      setSquadSetup({ teamId: "", players: "" });
    } catch (error) {
      setErrorMessage(error.message || "Unable to create tournament.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFixtureResult(tournamentId, fixtureId, payload) {
    setErrorMessage("");

    try {
      const updatedTournament = await updateFixtureResult(tournamentId, fixtureId, payload);
      setTournaments([updatedTournament]);
    } catch (error) {
      setErrorMessage(error.message || "Unable to update fixture result.");
    }
  }

  async function handleCreateGroups(tournamentId) {
    setErrorMessage("");

    try {
      const updatedTournament = await createTournamentGroups(tournamentId, {
        groupCount: groupSetup.groupCount,
        groupNames: groupSetup.groupNames.split(","),
      });
      setTournaments([updatedTournament]);
      setSquadSetup((currentValue) => ({
        ...currentValue,
        teamId: updatedTournament.teams[0]?.id || currentValue.teamId,
      }));
    } catch (error) {
      setErrorMessage(error.message || "Unable to create groups.");
    }
  }

  async function handleAddTeams(tournamentId) {
    setErrorMessage("");

    try {
      const updatedTournament = await addTournamentTeams(tournamentId, {
        teams: teamSetup.teams.split(","),
      });
      setTournaments([updatedTournament]);
      setTeamSetup({ teams: "" });
      setSquadSetup((currentValue) => ({
        ...currentValue,
        teamId: updatedTournament.teams[0]?.id || currentValue.teamId,
      }));
    } catch (error) {
      setErrorMessage(error.message || "Unable to add teams.");
    }
  }

  async function handleStartSchedule(tournamentId) {
    setErrorMessage("");

    try {
      const updatedTournament = await startTournamentSchedule(tournamentId);
      setTournaments([updatedTournament]);
    } catch (error) {
      setErrorMessage(error.message || "Unable to start match schedule.");
    }
  }

  async function handleUpdateTeamSquad(tournamentId) {
    setErrorMessage("");

    try {
      const updatedTournament = await updateTournamentTeamSquad(
        tournamentId,
        squadSetup.teamId,
        { players: squadSetup.players.split(",") },
      );
      setTournaments([updatedTournament]);
      setSquadSetup((currentValue) => ({
        ...currentValue,
        players: "",
      }));
    } catch (error) {
      setErrorMessage(error.message || "Unable to update team players.");
    }
  }

  async function handleTournamentAwards(tournamentId, payload) {
    setErrorMessage("");

    try {
      const updatedTournament = await updateTournamentAwards(tournamentId, payload);
      setTournaments([updatedTournament]);
    } catch (error) {
      setErrorMessage(error.message || "Unable to update tournament awards.");
    }
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role={mode} />

        <section className="hero-panel">
          <div className="hero-layout">
            <div className="hero-copy">
              <span className="eyebrow">{isAdmin ? "Tournament Admin" : "Tournament Center"}</span>
              <h1>{selectedTournament ? selectedTournament.name : "Tournament Center"}</h1>
              <p>
                {isAdmin
                  ? "Create the tournament once, then manage teams, groups, fixtures, squads, and results from a single place."
                  : "Follow the schedule, standings, squads, results, and match progress from one simple tournament view."}
              </p>
              <div className="hero-meta">
                <span>{selectedTournament?.format || "Format TBA"}</span>
                <span>{selectedTournament?.overs ? `${selectedTournament.overs} overs` : "Overs TBA"}</span>
                <span>{selectedTournament?.venue || "Venue TBA"}</span>
                <span>{selectedTournament ? `${formatDisplayDate(selectedTournament?.startDate)} to ${formatDisplayDate(selectedTournament?.endDate)}` : "Dates not set"}</span>
                <span>{isAdmin ? "Auto refresh: 12s" : "Auto refresh: 18s"}</span>
              </div>
            </div>

            <div className="hero-visual-panel">
              <img
                src={tournamentHero}
                alt="Tournament trophy and bracket illustration"
                className="hero-illustration"
              />
              <div className="hero-floating-card">
                <div className="floating-card-mark floating-mark-placeholder">WC</div>
                <div>
                  <strong>
                    {selectedTournament?.status === "completed"
                      ? "Tournament complete"
                      : "Tournament active"}
                  </strong>
                  <span>
                    {selectedTournament
                      ? `${selectedTournament.stats.completedMatches}/${selectedTournament.stats.totalMatches} matches done`
                      : "Create the official tournament to begin"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {selectedTournament ? <TournamentTabs mode={mode} /> : null}

        {selectedTournament ? (
          <section className="stats-grid">
            <section className="sidebar-card tournament-identity-card">
              <div className="card-kicker">Tournament Snapshot</div>
              <h3>{selectedTournament.name}</h3>
              <div className="identity-meta">
                <span>{selectedTournament.format}</span>
                <span>{selectedTournament.overs} overs</span>
                <span>{selectedTournament.teams.length} teams</span>
                <span>{selectedTournament.groups.length} groups</span>
                <span>{selectedTournament.fixtures.length} fixtures</span>
                <span>{selectedTournament.status}</span>
              </div>
            </section>

            <section className="sidebar-card tournament-progress-card">
              <div className="card-kicker">Progress</div>
              <div className="progress-metrics">
                <div className="metric-pill">
                  <span>Total Matches</span>
                  <strong>{selectedTournament.stats.totalMatches}</strong>
                </div>
                <div className="metric-pill">
                  <span>Completed</span>
                  <strong>{selectedTournament.stats.completedMatches}</strong>
                </div>
                <div className="metric-pill">
                  <span>Upcoming</span>
                  <strong>{selectedTournament.stats.upcomingMatches}</strong>
                </div>
                <div className="metric-pill highlight-pill">
                  <span>Top Team</span>
                  <strong>{selectedTournament.stats.topTeam || "-"}</strong>
                </div>
              </div>
            </section>
          </section>
        ) : null}

        {isAdmin ? (
          <section className="sidebar-card helper-card">
            <div className="section-toolbar">
              <div>
                <h3>Tournament Setup Flow</h3>
                <p>Use this order to avoid missing any setup step.</p>
              </div>
            </div>
            <div className="helper-grid">
              <div className="helper-item">
                <span className="helper-step">1</span>
                <div>
                  <strong>Create the tournament</strong>
                  <p>Enter name, format, dates, and venue first.</p>
                </div>
              </div>
              <div className="helper-item">
                <span className="helper-step">2</span>
                <div>
                  <strong>Add groups and teams</strong>
                  <p>Set group names, then add the teams that belong in the event.</p>
                </div>
              </div>
              <div className="helper-item">
                <span className="helper-step">3</span>
                <div>
                  <strong>Fill squads and start schedule</strong>
                  <p>Update player lists, then generate or begin the schedule.</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <Outlet
          context={{
            canCreateTournament,
            errorMessage,
            formatDisplayDate,
            formData,
            groupSetup,
            handleChange,
            handleAddTeams,
            handleCreateGroups,
            handleFixtureResult,
            handleGroupSetupChange,
            handleSquadSetupChange,
            handleTeamSetupChange,
            handleStartSchedule,
            handleSubmit,
            handleTournamentAwards,
            handleUpdateTeamSquad,
            isAdmin,
            isSaving,
            selectedTournament,
            squadSetup,
            teamSetup,
          }}
        />

        {errorMessage ? (
          <section className="sidebar-card">
            <p className="form-error">{errorMessage}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default TournamentPage;
