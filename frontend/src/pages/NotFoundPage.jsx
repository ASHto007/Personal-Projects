import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="sidebar-card not-found-card">
          <h1>404</h1>
          <p>The page you requested does not exist in this frontend yet.</p>
          <Link to="/home" className="nav-link active">
            Go back home
          </Link>
        </section>
      </div>
    </main>
  );
}

export default NotFoundPage;
