import { NavLink } from "react-router-dom";

function MatchCenterTabs({ mode }) {
  const basePath = mode === "admin" ? "/admin/live-score" : "/live-score";

  const links = [
    { to: `${basePath}/summary`, label: "Live Summary" },
    { to: `${basePath}/scorecard`, label: "Full Scorecard" },
    { to: `${basePath}/commentary`, label: "Ball By Ball" },
    { to: `${basePath}/stats`, label: "Key Stats" },
    { to: `${basePath}/search`, label: "Player Search" },
  ];

  return (
    <div className="tournament-tabs">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `tournament-tab${isActive ? " active-tournament-tab" : ""}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}

export default MatchCenterTabs;
