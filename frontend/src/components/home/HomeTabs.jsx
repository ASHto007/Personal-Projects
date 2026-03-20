import { NavLink } from "react-router-dom";

function HomeTabs() {
  const links = [
    { to: "/home/overview", label: "Overview" },
    { to: "/home/tournament", label: "Tournament" },
    { to: "/home/match", label: "Match" },
    { to: "/home/results", label: "Results" },
  ];

  return (
    <div className="home-tabs">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `home-tab${isActive ? " active-home-tab" : ""}`}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}

export default HomeTabs;
