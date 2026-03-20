import { Link, useOutletContext } from "react-router-dom";

function HomeMatchSection() {
  const {
    currentMatch,
    isLiveMatchActive,
    upcomingFixtures,
    formatDisplayDate,
  } = useOutletContext();

  if (!isLiveMatchActive && !upcomingFixtures.length) {
    return (
      <section className="sidebar-card live-match-card">
        <div className="section-label">Matches</div>
        <p>No live or upcoming matches available right now.</p>
      </section>
    );
  }

  return (
    <section className="sidebar-card live-match-card">
      {isLiveMatchActive ? <div className="section-label">Live Match</div> : null}
      <div className="table-list">
        {isLiveMatchActive ? (
          <div className="fixture-card compact-fixture-card">
            <div className="fixture-topline">
              <span className="fixture-round">Now Live</span>
              <span className="live-pill">LIVE</span>
            </div>
            <div className="fixture-title">
              {currentMatch.teamOne} vs {currentMatch.teamTwo}
            </div>
            <p className="fixture-result-text">
              {currentMatch.format} | {currentMatch.overs} overs
            </p>
          </div>
        ) : null}

        {upcomingFixtures.length ? (
          <>
            <div className="section-label">Upcoming Matches</div>
            {upcomingFixtures.map((fixture) => (
              <div key={fixture.id} className="fixture-card compact-fixture-card">
                <div className="fixture-topline">
                  <span className="fixture-round">{fixture.groupName || "Next Match"}</span>
                  <span className="fixture-status fixture-status-scheduled">Upcoming</span>
                </div>
                <div className="fixture-title">
                  {fixture.teamA} vs {fixture.teamB}
                </div>
                <p className="fixture-result-text">
                  {formatDisplayDate(fixture.date)}
                  {fixture.venue ? ` | ${fixture.venue}` : ""}
                </p>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}

export default HomeMatchSection;
