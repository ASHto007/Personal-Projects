import { useOutletContext } from "react-router-dom";
import HomeLiveOverviewSection from "./HomeLiveOverviewSection";
import HomeResultsSection from "./HomeResultsSection";
import HomeTournamentSection from "./HomeTournamentSection";

function HomeOverviewSection() {
  const { hasLiveContent } = useOutletContext();

  return (
    <div className="home-sections-stack">
      {hasLiveContent ? (
        <>
          <HomeLiveOverviewSection />
          <HomeTournamentSection />
        </>
      ) : null}
      <HomeResultsSection />
    </div>
  );
}

export default HomeOverviewSection;
