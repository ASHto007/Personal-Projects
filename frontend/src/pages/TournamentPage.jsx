import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  createTournament,
  listTournaments,
  updateFixtureResult,
} from "../services/tournamentService";
import tournamentHero from "../assets/tournament-hero.svg";
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
    venue: "",
    startDate: "",
    logoUrl: "",
    groupCount: 2,
    teams: "",
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
      [name]: name === "groupCount" ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        teams: formData.teams.split(","),
      };

      const response = await createTournament(payload);
      setTournaments([response]);
      setFormData({
        name: "",
        format: "ODI",
        venue: "",
        startDate: "",
        logoUrl: "",
        groupCount: 2,
        teams: "",
      });
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

  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role={mode} />

        <section className="hero-panel">
          <div className="hero-layout">
            <div className="hero-copy">
              <span className="eyebrow">{isAdmin ? "Tournament Admin" : "Tournament Center"}</span>
              <h1>{selectedTournament ? selectedTournament.name : "International Tournament Desk"}</h1>
              <p>
                {isAdmin
                  ? "Operate one official tournament with auto-generated group fixtures, results, squads, schedule, and points tables."
                  : "Follow the official tournament schedule, group standings, squads, results, and match feed."}
              </p>
              <div className="hero-meta">
                <span>{selectedTournament?.format || "Format TBA"}</span>
                <span>{selectedTournament?.venue || "Venue TBA"}</span>
                <span>{formatDisplayDate(selectedTournament?.startDate)}</span>
                <span>{isAdmin ? "Refresh 12s" : "Refresh 18s"}</span>
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
                <span>{selectedTournament.teams.length} teams</span>
                <span>{selectedTournament.groups.length} groups</span>
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

        <Outlet
          context={{
            canCreateTournament,
            errorMessage,
            formatDisplayDate,
            formData,
            handleChange,
            handleFixtureResult,
            handleSubmit,
            isAdmin,
            isSaving,
            selectedTournament,
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
