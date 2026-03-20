import { NavLink } from "react-router-dom";

function TournamentTabs({ mode }) {
  const basePath = mode === "admin" ? "/admin/tournaments" : "/tournaments";

  const links = [
    { to: basePath, label: "Overview", end: true },
    { to: `${basePath}/schedule`, label: "Schedule" },
    { to: `${basePath}/standings`, label: "Point Table" },
    { to: `${basePath}/results`, label: "Results" },
    { to: `${basePath}/squads`, label: "Squads" },
    { to: `${basePath}/stats`, label: "Stats" },
  ];

  return (
    <div className="tournament-tabs">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
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

export default TournamentTabs;
