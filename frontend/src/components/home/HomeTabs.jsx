import { NavLink } from "react-router-dom";

function HomeTabs() {
  const links = [
    { to: "/home/overview", label: "Quick View" },
    { to: "/home/tournament", label: "Tournament View" },
    { to: "/home/match", label: "Match View" },
    { to: "/home/results", label: "Recent Results" },
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
