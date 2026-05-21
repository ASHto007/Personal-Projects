import { Link, useOutletContext } from "react-router-dom";
import brandMark from "../../assets/fieldpulse-mark.png";

function HomeTournamentSection() {
  const { currentTournament, formatDisplayDate } = useOutletContext();

  if (!currentTournament) {
    return null;
  }

  return (
    <section className="sidebar-card tournament-spotlight-card">
      <div className="section-label">Ongoing Tournament</div>
      <div className="tournament-spotlight-body">
        <div className="tournament-logo-shell">
          {currentTournament.logoUrl ? (
            <img
              src={currentTournament.logoUrl}
              alt={`${currentTournament.name} logo`}
              className="tournament-logo-image"
            />
          ) : (
            <img
              src={brandMark}
              alt={`${currentTournament.name} logo`}
              className="tournament-logo-image"
            />
          )}
        </div>
        <div className="tournament-spotlight-meta">
          <h3>{currentTournament.name}</h3>
          {currentTournament.venue ? (
            <div className="tournament-info-line">
              <span>Venue</span>
              <strong>{currentTournament.venue}</strong>
            </div>
          ) : null}
          {formatDisplayDate(currentTournament.startDate) ? (
            <div className="tournament-info-line">
              <span>Date</span>
              <strong>{formatDisplayDate(currentTournament.startDate)}</strong>
            </div>
          ) : null}
        </div>
        <Link to="/tournaments" className="primary-link">
          Open Tournament Center
        </Link>
      </div>
    </section>
  );
}

export default HomeTournamentSection;
