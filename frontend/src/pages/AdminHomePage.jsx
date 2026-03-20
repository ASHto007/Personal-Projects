import { Link } from "react-router-dom";
import RoleNav from "../components/RoleNav";

function AdminHomePage() {
  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role="admin" />

        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Admin Console</span>
            <h1>Run The Match In 3 Steps</h1>
            <p>
              Use this page as your control desk. Start with tournament setup, prepare the
              match, then move to live scoring.
            </p>
            <div className="hero-meta">
              <span>Step 1: Tournament</span>
              <span>Step 2: Match Setup</span>
              <span>Step 3: Live Score</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <section className="sidebar-card admin-simple-card admin-step-card">
            <div className="admin-step-badge">1</div>
            <div className="section-label">Tournament</div>
            <h3>Create or update the tournament</h3>
            <p>Manage teams, groups, fixtures, schedule, results, and standings.</p>
            <Link to="/admin/tournaments" className="primary-link">
              Open Tournament
            </Link>
          </section>

          <section className="sidebar-card admin-simple-card admin-step-card">
            <div className="admin-step-badge">2</div>
            <div className="section-label">Match Setup</div>
            <h3>Prepare the next match</h3>
            <p>Enter teams, toss, opening batters, and the starting bowler.</p>
            <Link to="/admin/match-setup" className="primary-link">
              Open Match Setup
            </Link>
          </section>

          <section className="sidebar-card admin-simple-card admin-step-card">
            <div className="admin-step-badge">3</div>
            <div className="section-label">Live Score</div>
            <h3>Update the score ball by ball</h3>
            <p>Control players, add events, finish innings, and publish the live state.</p>
            <Link to="/admin/live-score" className="primary-link">
              Open Scoring Desk
            </Link>
          </section>
        </section>

        <section className="stats-grid">
          <section className="sidebar-card admin-simple-card">
            <h3>What To Do First</h3>
            <div className="table-list">
              <div className="table-row">
                <span>If no tournament exists</span>
                <span>Open Tournament</span>
              </div>
              <div className="table-row">
                <span>If tournament is ready</span>
                <span>Open Match Setup</span>
              </div>
              <div className="table-row">
                <span>If match has started</span>
                <span>Open Scoring Desk</span>
              </div>
            </div>
          </section>

          <section className="sidebar-card admin-simple-card">
            <h3>Quick Links</h3>
            <div className="action-row">
              <Link to="/admin/live-score" className="secondary-link">
                Admin Score
              </Link>
              <Link to="/admin/tournaments" className="secondary-link">
                Tournament Admin
              </Link>
              <Link to="/admin/match-setup" className="secondary-link">
                Match Setup
              </Link>
              <Link to="/home" className="secondary-link">
                Viewer Home
              </Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

export default AdminHomePage;
