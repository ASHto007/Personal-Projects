import { NavLink } from "react-router-dom";

function TournamentTabs({ mode }) {
  const basePath = mode === "admin" ? "/admin/tournaments" : "/tournaments";

  const links = [
    { to: basePath, label: "Summary", end: true },
    { to: `${basePath}/schedule`, label: "Match Schedule" },
    { to: `${basePath}/standings`, label: "Standings" },
    { to: `${basePath}/results`, label: "Match Results" },
    { to: `${basePath}/squads`, label: "Team Squads" },
    { to: `${basePath}/stats`, label: "Tournament Stats" },
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
