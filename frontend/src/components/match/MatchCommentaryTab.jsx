import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

function MatchCommentaryTab() {
  const { currentInnings, match } = useOutletContext();
  const [inningsFilter, setInningsFilter] = useState("current");

  const commentaryItems = useMemo(() => {
    if (!match?.innings?.length) {
      return [];
    }

    if (inningsFilter === "all") {
      return match.innings.flatMap((innings) => innings.commentary || []);
    }

    if (inningsFilter === "current") {
      return currentInnings?.commentary || [];
    }

    return match.innings.find((innings) => String(innings.number) === inningsFilter)?.commentary || [];
  }, [currentInnings, inningsFilter, match]);

  if (!match) {
    return null;
  }

  return (
    <section className="sidebar-card">
      <div className="section-toolbar">
        <div>
          <h3>Ball-By-Ball Commentary</h3>
          <p>Recent deliveries from the live feed.</p>
        </div>
        <label className="toolbar-select">
          <span>View</span>
          <select value={inningsFilter} onChange={(event) => setInningsFilter(event.target.value)}>
            <option value="current">Current innings</option>
            <option value="all">All innings</option>
            <option value="1">Innings 1</option>
            <option value="2">Innings 2</option>
          </select>
        </label>
      </div>

      <div className="commentary-list">
        {commentaryItems.length ? (
          commentaryItems.map((item) => (
            <article key={item.id} className="commentary-card">
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
                <span>{new Date(item.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </article>
          ))
        ) : (
          <p>No commentary available yet.</p>
        )}
      </div>
    </section>
  );
}

export default MatchCommentaryTab;
