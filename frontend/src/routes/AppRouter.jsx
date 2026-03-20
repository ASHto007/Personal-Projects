import { Navigate, Route, Routes } from "react-router-dom";
import AdminHomePage from "../pages/AdminHomePage";
import HomeMatchSection from "../components/home/HomeMatchSection";
import HomeOverviewSection from "../components/home/HomeOverviewSection";
import HomeResultsSection from "../components/home/HomeResultsSection";
import HomeTournamentSection from "../components/home/HomeTournamentSection";
import TournamentOverview from "../components/tournament/TournamentOverview";
import TournamentResults from "../components/tournament/TournamentResults";
import TournamentSchedule from "../components/tournament/TournamentSchedule";
import TournamentSquads from "../components/tournament/TournamentSquads";
import TournamentStandings from "../components/tournament/TournamentStandings";
import TournamentStats from "../components/tournament/TournamentStats";
import TournamentMatchDetails from "../components/tournament/TournamentMatchDetails";
import MatchCommentaryTab from "../components/match/MatchCommentaryTab";
import MatchScorecardTab from "../components/match/MatchScorecardTab";
import MatchSearchTab from "../components/match/MatchSearchTab";
import MatchStatsTab from "../components/match/MatchStatsTab";
import MatchSummaryTab from "../components/match/MatchSummaryTab";
import HomePage from "../pages/HomePage";
import MatchCenterPage from "../pages/MatchCenterPage";
import MatchSetupPage from "../pages/MatchSetupPage";
import NotFoundPage from "../pages/NotFoundPage";
import TournamentPage from "../pages/TournamentPage";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage mode="viewer" />}>
        <Route index element={<Navigate to="/home/overview" replace />} />
        <Route path="overview" element={<HomeOverviewSection />} />
        <Route path="tournament" element={<HomeTournamentSection />} />
        <Route path="match" element={<HomeMatchSection />} />
        <Route path="results" element={<HomeResultsSection />} />
      </Route>
      <Route path="/tournaments" element={<TournamentPage mode="viewer" />}>
        <Route index element={<TournamentOverview />} />
        <Route path="matches" element={<Navigate to="/tournaments/schedule" replace />} />
        <Route path="match/:fixtureId" element={<TournamentMatchDetails />} />
        <Route path="schedule" element={<TournamentSchedule />} />
        <Route path="standings" element={<TournamentStandings />} />
        <Route path="results" element={<TournamentResults />} />
        <Route path="squads" element={<TournamentSquads />} />
        <Route path="stats" element={<TournamentStats />} />
      </Route>
      <Route path="/live-score" element={<MatchCenterPage mode="viewer" />}>
        <Route index element={<Navigate to="/live-score/summary" replace />} />
        <Route path="summary" element={<MatchSummaryTab />} />
        <Route path="scorecard" element={<MatchScorecardTab />} />
        <Route path="commentary" element={<MatchCommentaryTab />} />
        <Route path="stats" element={<MatchStatsTab />} />
        <Route path="search" element={<MatchSearchTab />} />
      </Route>
      <Route path="/match-setup" element={<MatchSetupPage />} />
      <Route path="/admin" element={<AdminHomePage />} />
      <Route path="/admin/tournaments" element={<TournamentPage mode="admin" />}>
        <Route index element={<TournamentOverview />} />
        <Route path="matches" element={<Navigate to="/admin/tournaments/schedule" replace />} />
        <Route path="match/:fixtureId" element={<TournamentMatchDetails />} />
        <Route path="schedule" element={<TournamentSchedule />} />
        <Route path="standings" element={<TournamentStandings />} />
        <Route path="results" element={<TournamentResults />} />
        <Route path="squads" element={<TournamentSquads />} />
        <Route path="stats" element={<TournamentStats />} />
      </Route>
      <Route path="/admin/match-setup" element={<MatchSetupPage />} />
      <Route path="/admin/live-score" element={<MatchCenterPage mode="admin" />}>
        <Route index element={<Navigate to="/admin/live-score/summary" replace />} />
        <Route path="summary" element={<MatchSummaryTab />} />
        <Route path="scorecard" element={<MatchScorecardTab />} />
        <Route path="commentary" element={<MatchCommentaryTab />} />
        <Route path="stats" element={<MatchStatsTab />} />
        <Route path="search" element={<MatchSearchTab />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
