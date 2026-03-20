import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

function MatchSearchTab() {
  const { match } = useOutletContext();
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredBatters = useMemo(() => {
    if (!match?.innings?.length || !normalizedQuery) {
      return [];
    }

    return match.innings.flatMap((innings) =>
      innings.battingCard
        .filter((player) => player.name.toLowerCase().includes(normalizedQuery))
        .map((player) => ({
          ...player,
          inningsNumber: innings.number,
          team: innings.battingTeam,
        }))
    );
  }, [match, normalizedQuery]);

  const filteredBowlers = useMemo(() => {
    if (!match?.innings?.length || !normalizedQuery) {
      return [];
    }

    return match.innings.flatMap((innings) =>
      innings.bowlingCard
        .filter((player) => player.name.toLowerCase().includes(normalizedQuery))
        .map((player) => ({
          ...player,
          inningsNumber: innings.number,
          team: innings.bowlingTeam,
        }))
    );
  }, [match, normalizedQuery]);

  const filteredCommentary = useMemo(() => {
    if (!match?.innings?.length || !normalizedQuery) {
      return [];
    }

    return match.innings.flatMap((innings) =>
      (innings.commentary || []).filter((item) =>
        [
          item.text,
          item.event,
          item.batter,
          item.bowler,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery))
      )
    );
  }, [match, normalizedQuery]);

  if (!match) {
    return null;
  }

  return (
    <div className="match-center-stack">
      <section className="sidebar-card">
        <div className="section-toolbar">
          <div>
            <h3>Search Match Center</h3>
            <p>Find a batter, bowler, or commentary moment from the current match.</p>
          </div>
          <label className="toolbar-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player or event"
            />
          </label>
        </div>
      </section>

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Player Results</h3>
          <div className="table-list">
            {normalizedQuery ? (
              filteredBatters.length ? (
                filteredBatters.map((player) => (
                  <div
                    key={`${player.inningsNumber}-${player.name}`}
                    className="table-row"
                  >
                    <span>
                      {player.name} | {player.team}
                    </span>
                    <span>
                      {player.runs} ({player.balls}) | Innings {player.inningsNumber}
                    </span>
                  </div>
                ))
              ) : (
                <p>No player matches found.</p>
              )
            ) : (
              <p>Enter a player name to search the scorecard.</p>
            )}
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Bowler Results</h3>
          <div className="table-list">
            {normalizedQuery ? (
              filteredBowlers.length ? (
                filteredBowlers.map((player) => (
                  <div key={`${player.inningsNumber}-${player.name}`} className="table-row">
                    <span>
                      {player.name} | {player.team}
                    </span>
                    <span>
                      {player.overs} ov | {player.runs} runs | {player.wickets} wkts
                    </span>
                  </div>
                ))
              ) : (
                <p>No bowler matches found.</p>
              )
            ) : (
              <p>Search a bowler name to view live figures.</p>
            )}
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Commentary Results</h3>
          <div className="table-list">
            {normalizedQuery ? (
              filteredCommentary.length ? (
                filteredCommentary.map((item) => (
                  <article key={item.id} className="commentary-card compact-commentary-card">
                    <div className="commentary-topline">
                      <span className="section-label">
                        Inn {item.inningsNumber} | Over {item.over}
                      </span>
                      <strong>{item.event}</strong>
                    </div>
                    <h4>{item.text}</h4>
                    <div className="commentary-meta">
                      <span>
                        Score {item.totalRuns}/{item.wickets}
                      </span>
                      <span>
                        {item.batter} vs {item.bowler}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p>No commentary matches found.</p>
              )
            ) : (
              <p>Search boundaries, wickets, bowlers, or batters.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

export default MatchSearchTab;
