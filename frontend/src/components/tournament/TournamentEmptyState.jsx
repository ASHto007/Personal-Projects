import { Link } from "react-router-dom";

function TournamentEmptyState({ isAdmin = false }) {
  return (
    <section className="sidebar-card tournament-empty-card">
      <div className="upcoming-state-mark">WC</div>
      <div className="upcoming-state-copy">
        <span className="section-label">Tournament</span>
        <h3>No Tournament Available</h3>
        <p>
          {isAdmin
            ? "Create the official tournament to unlock schedule, standings, results, and squads."
            : "The tournament desk is waiting for the next official competition to be published."}
        </p>
      </div>
      <div className="upcoming-state-actions">
        {isAdmin ? (
          <Link to="/admin/tournaments" className="primary-link">
            Go To Overview
          </Link>
        ) : (
          <Link to="/" className="primary-link">
            Back To Home
          </Link>
        )}
      </div>
    </section>
  );
}

export default TournamentEmptyState;
