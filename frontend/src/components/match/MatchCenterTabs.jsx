import { NavLink } from "react-router-dom";

function MatchCenterTabs({ mode }) {
  const basePath = mode === "admin" ? "/admin/live-score" : "/live-score";

  const links = [
    { to: `${basePath}/summary`, label: "Summary" },
    { to: `${basePath}/scorecard`, label: "Scorecard" },
    { to: `${basePath}/commentary`, label: "Commentary" },
    { to: `${basePath}/stats`, label: "Stats" },
    { to: `${basePath}/search`, label: "Search" },
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
