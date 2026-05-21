import { useEffect, useMemo, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import homeDashboardHero from "../assets/home-dashboard-hero.png";
import { getCurrentMatch, getRecentMatches } from "../services/matchService";
import { listTournaments } from "../services/tournamentService";
import RoleNav from "../components/RoleNav";
import HomeTabs from "../components/home/HomeTabs";

function getCurrentInnings(match) {
  return (
    match?.innings?.find((innings) => innings.number === match.currentInnings) || null
  );
}

function getShortName(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "TM"
  );
}

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTotalExtrasForMatch(match) {
  return (match?.innings || []).reduce((total, innings) => {
    const extras = innings?.score?.extras;

    if (!extras) {
      return total;
    }

    return total + extras.wides + extras.noBalls + extras.byes + extras.legByes;
  }, 0);
}

function getCurrentBowler(innings) {
  return (
    innings?.bowlingCard?.find((player) => player.name === innings.players.currentBowler) ||
    null
  );
}

function getUpcomingFixtures(tournament) {
  return (tournament?.schedule || tournament?.fixtures || []).filter(
    (fixture) => fixture.status !== "completed",
  );
}

function getTeamScoreLine(match, teamName) {
  const innings = (match?.innings || []).find(
    (currentInnings) => currentInnings.battingTeam === teamName,
  );

  if (!innings) {
    return "Yet to bat";
  }

  return `${innings.score.runs}/${innings.score.wickets} (${innings.score.overs})`;
}

function getMatchLabel(match) {
  return (
    match?.tournamentName ||
    `${match?.format || "Match"} ${match?.overs || ""} overs`.trim()
  );
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function HomePage({ mode = "viewer" }) {
  const [currentMatch, setCurrentMatch] = useState(null);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [allTournaments, setAllTournaments] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [pageError, setPageError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        const [matchResponse, tournamentsResponse] = await Promise.allSettled([
          getCurrentMatch(),
          listTournaments(),
        ]);
        const recentMatchesResponse = await Promise.allSettled([getRecentMatches()]);

        if (!isMounted) {
          return;
        }

        if (matchResponse.status === "fulfilled") {
          setCurrentMatch(matchResponse.value);
        }

        if (tournamentsResponse.status === "fulfilled") {
          setAllTournaments(tournamentsResponse.value);
          const ongoingTournament =
            tournamentsResponse.value.find((tournament) =>
              (tournament.schedule || tournament.fixtures || []).some(
                (fixture) => fixture.status !== "completed",
              ),
            ) ||
            tournamentsResponse.value[0] ||
            null;

          setCurrentTournament(ongoingTournament);
        }

        if (recentMatchesResponse[0]?.status === "fulfilled") {
          setRecentMatches(recentMatchesResponse[0].value);
        }

        if (
          matchResponse.status === "rejected" &&
          tournamentsResponse.status === "rejected"
        ) {
          setPageError("Unable to load live overview right now.");
        }
      } catch {
        if (isMounted) {
          setPageError("Unable to load live overview right now.");
        }
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentInnings = getCurrentInnings(currentMatch);
  const currentBowler = getCurrentBowler(currentInnings);
  const currentPartnership = currentInnings?.partnership;
  const totalMatchExtras = getTotalExtrasForMatch(currentMatch);
  const isLiveMatchActive =
    Boolean(currentMatch && currentInnings) && currentMatch.status !== "completed";
  const upcomingFixtures = getUpcomingFixtures(currentTournament).slice(0, 3);
  const hasLiveContent = Boolean(currentTournament || isLiveMatchActive || upcomingFixtures.length);
  const summaryStats = [
    {
      label: "Live match",
      value: isLiveMatchActive
        ? `${currentMatch.teamOne} vs ${currentMatch.teamTwo}`
        : "No live match",
    },
    {
      label: "Current tournament",
      value: currentTournament?.name || "No active tournament",
    },
    {
      label: "Upcoming fixtures",
      value: String(upcomingFixtures.length),
    },
    {
      label: "Recent results",
      value: String(recentMatches.length),
    },
  ];
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) {
      return {
        tournaments: [],
        matches: [],
        schedules: [],
      };
    }

    const tournaments = [];
    const schedules = [];
    const matchEntries = [currentMatch, ...recentMatches].filter(Boolean);
    const matches = [];

    allTournaments.forEach((tournament) => {
      const haystack = [
        tournament.name,
        tournament.venue,
        ...(tournament.teams || []).map((team) => team.name),
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(normalizedSearchQuery)) {
        tournaments.push({
          id: `tournament-${tournament.id}`,
          title: tournament.name,
          description: `${tournament.format} | ${tournament.venue} | ${tournament.status}`,
          actionLabel: "Open Tournament",
          to: "/tournaments",
        });
      }

      const matchingFixtures = [];
      (tournament.schedule || tournament.fixtures || []).forEach((fixture) => {
        const fixtureHaystack = [
          fixture.teamA,
          fixture.teamB,
          fixture.groupName,
          fixture.venue,
          tournament.name,
        ]
          .join(" ")
          .toLowerCase();

        if (fixtureHaystack.includes(normalizedSearchQuery)) {
          matchingFixtures.push({
            id: `fixture-${tournament.id}-${fixture.id}`,
            title: `${fixture.teamA} vs ${fixture.teamB}`,
            description: `${fixture.groupName || "Match"} | ${
              fixture.result?.summary || `${formatDisplayDate(fixture.date)} | ${fixture.venue}`
            }`,
            actionLabel: "Open Schedule",
            to: "/tournaments/schedule",
          });
        }
      });

      if (matchingFixtures.length) {
        schedules.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          tournamentMeta: `${tournament.format} | ${tournament.venue}`,
          fixtures: matchingFixtures,
        });
      }
    });

    matchEntries.forEach((match) => {
      const haystack = [
        match.teamOne,
        match.teamTwo,
        match.venue,
        match.location,
        match.turfName,
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(normalizedSearchQuery)) {
        matches.push({
          id: `match-${match.id}`,
          type: match.status === "completed" ? "Recent Match" : "Live Match",
          title: `${match.teamOne} vs ${match.teamTwo}`,
          description: match.result || `${getMatchLabel(match)} | ${match.status}`,
          actionLabel: "Open Match Center",
          to: "/live-score/scorecard",
        });
      }
    });

    return {
      tournaments: tournaments.slice(0, 6),
      matches: matches.slice(0, 6),
      schedules: schedules.slice(0, 6),
    };
  }, [allTournaments, currentMatch, normalizedSearchQuery, recentMatches]);

  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role={mode} />

        <section className="hero-panel">
          <div className="hero-layout">
            <div className="hero-copy">
              <span className="eyebrow">FieldPulse Cricket</span>
              <h1>Cricket Dashboard Made Simple</h1>
              <p>
                Start here to see the live match, upcoming tournament fixtures, and recent
                results without jumping between pages.
              </p>
              <div className="hero-meta">
                <span>1. Check live score</span>
                <span>2. Open tournament</span>
                <span>3. Review recent results</span>
              </div>
              <label className="home-search-bar">
                <span>Find a team, tournament, or fixture</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Example: India, Group A, Mumbai, T20"
                />
              </label>
            </div>

            <div className="hero-visual-panel">
              <img
                src={homeDashboardHero}
                alt="Cricket dashboard illustration with live score and tournament tracking"
                className="hero-illustration"
              />
              <div className="hero-floating-card">
                <div className="floating-card-mark floating-mark-placeholder">FP</div>
                <div>
                  <strong>{isLiveMatchActive ? "Match day live" : "Ready for the next game"}</strong>
                  <span>
                    {currentTournament
                      ? `${currentTournament.name} ${upcomingFixtures.length ? `| ${upcomingFixtures.length} upcoming` : "| fixtures ready"}`
                      : "Follow score, schedule, and results from one place"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="quick-guide-grid">
          {summaryStats.map((item) => (
            <article key={item.label} className="sidebar-card quick-guide-card">
              <span className="section-label">{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        <section className="sidebar-card helper-card">
          <div className="section-toolbar">
            <div>
              <h3>How To Use This Dashboard</h3>
              <p>Choose the section that matches what you want to follow right now.</p>
            </div>
            <div className="action-row">
              <Link to="/live-score/summary" className="primary-link">
                Open Live Score
              </Link>
              <Link to="/tournaments" className="secondary-link">
                Open Tournament
              </Link>
            </div>
          </div>
          <div className="helper-grid">
            <div className="helper-item">
              <span className="helper-step">1</span>
              <div>
                <strong>Quick View</strong>
                <p>See the most important live and tournament updates in one place.</p>
              </div>
            </div>
            <div className="helper-item">
              <span className="helper-step">2</span>
              <div>
                <strong>Match View</strong>
                <p>Follow the current match and the next fixtures.</p>
              </div>
            </div>
            <div className="helper-item">
              <span className="helper-step">3</span>
              <div>
                <strong>Recent Results</strong>
                <p>Review finished matches without opening the scoring desk.</p>
              </div>
            </div>
          </div>
        </section>

        <HomeTabs />

        {normalizedSearchQuery ? (
          <section className="sidebar-card">
            <div className="section-toolbar">
              <div>
                <h3>Search Results</h3>
                <p>
                  Results for <strong>{searchQuery.trim()}</strong>
                </p>
              </div>
            </div>
            {searchResults.tournaments.length ||
            searchResults.matches.length ||
            searchResults.schedules.length ? (
              <div className="search-group-stack">
                {searchResults.tournaments.length ? (
                  <section className="search-group">
                    <div className="search-group-header">
                      <h4>Tournaments</h4>
                    </div>
                    <div className="search-results-grid">
                      {searchResults.tournaments.map((result) => (
                        <article key={result.id} className="search-result-card">
                          <div className="search-result-topline">
                            <span className="section-label">Tournament</span>
                          </div>
                          <h4>{result.title}</h4>
                          <p>{result.description}</p>
                          <Link to={result.to} className="secondary-link">
                            {result.actionLabel}
                          </Link>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {searchResults.matches.length ? (
                  <section className="search-group">
                    <div className="search-group-header">
                      <h4>Matches</h4>
                    </div>
                    <div className="search-results-grid">
                      {searchResults.matches.map((result) => (
                        <article key={result.id} className="search-result-card">
                          <div className="search-result-topline">
                            <span className="section-label">{result.type}</span>
                          </div>
                          <h4>{result.title}</h4>
                          <p>{result.description}</p>
                          <Link to={result.to} className="secondary-link">
                            {result.actionLabel}
                          </Link>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {searchResults.schedules.length ? (
                  <section className="search-group">
                    <div className="search-group-header">
                      <h4>Schedules By Tournament</h4>
                    </div>
                    <div className="search-schedule-stack">
                      {searchResults.schedules.map((group) => (
                        <section key={group.tournamentId} className="search-schedule-group">
                          <div className="search-schedule-header">
                            <div>
                              <h4>{group.tournamentName}</h4>
                              <p>{group.tournamentMeta}</p>
                            </div>
                            <Link to="/tournaments/schedule" className="secondary-link">
                              Open Schedule
                            </Link>
                          </div>
                          <div className="search-results-grid">
                            {group.fixtures.map((fixture) => (
                              <article key={fixture.id} className="search-result-card">
                                <div className="search-result-topline">
                                  <span className="section-label">Schedule</span>
                                </div>
                                <h4>{fixture.title}</h4>
                                <p>{fixture.description}</p>
                                <Link to={fixture.to} className="secondary-link">
                                  {fixture.actionLabel}
                                </Link>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <p>No tournaments or matches found for this search.</p>
            )}
          </section>
        ) : null}

        {hasLiveContent || recentMatches.length ? (
          <Outlet
            context={{
              currentBowler,
              currentInnings,
              currentMatch,
              currentPartnership,
              currentTournament,
              formatDisplayDate,
              getMatchLabel,
              getShortName,
              getTeamScoreLine,
              hasLiveContent,
              isLiveMatchActive,
              recentMatches,
              totalMatchExtras,
              upcomingFixtures,
            }}
          />
        ) : (
          <section className="sidebar-card upcoming-state-card">
            <div className="upcoming-state-mark">FP</div>
            <div className="upcoming-state-copy">
              <span className="section-label">Upcoming</span>
              <h3>No Live Cricket Right Now</h3>
              <p>
                The center is waiting for the next tournament or match to go live.
                Use the admin side to prepare the next event.
              </p>
            </div>
            <div className="upcoming-state-actions">
              <Link to="/tournaments" className="primary-link">
                View Tournament Center
              </Link>
              <Link to="/admin" className="secondary-link">
                Open Admin Console
              </Link>
            </div>
          </section>
        )}

        {pageError ? (
          <section className="sidebar-card">
            <p className="form-error">{pageError}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default HomePage;
