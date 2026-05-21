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
            <h1>Run The Match In 3 Simple Steps</h1>
            <p>
              This is the simplest path for the scorer. Set up the tournament, prepare the
              match, then move to live scoring when play begins.
            </p>
            <div className="hero-meta">
              <span>1. Tournament Setup</span>
              <span>2. Match Setup</span>
              <span>3. Scoring Desk</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <section className="sidebar-card admin-simple-card admin-step-card">
             <div className="admin-step-badge">1</div>
             <div className="section-label">Step 1</div>
             <h3>Create the tournament</h3>
             <p>Add teams, groups, squads, schedule, and results in one place.</p>
             <Link to="/admin/tournaments" className="primary-link">
               Open Tournament Setup
             </Link>
           </section>

          <section className="sidebar-card admin-simple-card admin-step-card">
             <div className="admin-step-badge">2</div>
             <div className="section-label">Step 2</div>
             <h3>Prepare the next match</h3>
             <p>Choose the teams, set the toss, and enter the opening players.</p>
             <Link to="/admin/match-setup" className="primary-link">
               Open Match Setup
             </Link>
          </section>

          <section className="sidebar-card admin-simple-card admin-step-card">
             <div className="admin-step-badge">3</div>
             <div className="section-label">Step 3</div>
             <h3>Score the match live</h3>
             <p>Update each ball, manage players, and close the innings when needed.</p>
             <Link to="/admin/live-score" className="primary-link">
               Open Scoring Desk
             </Link>
          </section>
        </section>

        <section className="stats-grid">
          <section className="sidebar-card admin-simple-card">
            <h3>Start Here</h3>
            <div className="table-list">
              <div className="table-row">
                <span>No tournament created yet</span>
                <span>Open Tournament Setup</span>
              </div>
              <div className="table-row">
                <span>Tournament is ready</span>
                <span>Open Match Setup</span>
              </div>
              <div className="table-row">
                <span>Match has started</span>
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
