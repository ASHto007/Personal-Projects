import { NavLink } from "react-router-dom";
import brandMark from "../assets/fieldpulse-mark.svg";

function RoleNav({ role }) {
  const isAdmin = role === "admin";
  const viewerLinks = [
    { to: "/home", label: "Home" },
    { to: "/tournaments", label: "Tournaments" },
    { to: "/live-score", label: "Match Center" },
  ];
  const adminLinks = [
    { to: "/admin", label: "Admin Home", end: true },
    { to: "/admin/tournaments", label: "Admin Tournaments" },
    { to: "/admin/match-setup", label: "Match Setup" },
    { to: "/admin/live-score", label: "Admin Score" },
  ];

  return (
    <nav className="top-nav">
      <div className="nav-brand">
        <img src={brandMark} alt="FieldPulse Cricket logo" className="nav-brand-mark" />
        <div>
          <strong>FieldPulse Cricket</strong>
          <span>{isAdmin ? "Admin console" : "Viewer center"}</span>
        </div>
      </div>

      <div className="nav-group">
        {(isAdmin ? adminLinks : viewerLinks).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="nav-group nav-group-secondary">
        {isAdmin ? (
          <NavLink to="/home" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Viewer Home
          </NavLink>
        ) : (
          <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Admin
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default RoleNav;
