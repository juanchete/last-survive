import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ErrorBoundary, AsyncErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Draft from "./pages/Draft";
import DraftRoom from "./pages/DraftRoom";
import DraftTesting from "./pages/DraftTesting";
import DraftDebug from "./pages/DraftDebug";
import EliminationControl from "./pages/EliminationControl";
import Standings from "./pages/Standings";
import Picks from "./pages/Picks";
import Waivers from "./pages/Waivers";
import WaiverProcessing from "./pages/WaiverProcessing";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Hub from "./pages/Hub";
import BrowseLeagues from "./pages/BrowseLeagues";
import CreateLeague from "./pages/CreateLeague";
import Profile from "./pages/Profile";
import JoinLeague from "./pages/JoinLeague";
import AdminPanel from "./pages/AdminPanel";
import { AuthProvider } from "@/hooks/useAuth";
import PrivateRoute from "@/components/PrivateRoute";

// Import test file for development
if (import.meta.env.DEV) {
  import('./test-sportsdata-integration');
  // Note: sync-sportsdata script disabled due to Sleeper removal
}
import AdminRoute from "@/components/AdminRoute";
import Trades from "./pages/Trades";
import LeagueManagerDashboard from "./pages/LeagueManagerDashboard";
import LeagueDashboard from "./pages/LeagueDashboard";
import TeamBattle from "./pages/TeamBattle";
import Team from "./pages/Team";
import TestingDashboard from "./pages/TestingDashboard";
import TestRealtime from "./pages/TestRealtime";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <AsyncErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
            <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/join-league" element={<JoinLeague />} />
              <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/league-dashboard" element={<LeagueDashboard />} />
            <Route path="/team-battle" element={<TeamBattle />} />
            <Route path="/team" element={<Team />} />
            <Route path="/draft" element={<Draft />} />
            <Route path="/league/:leagueId/draft" element={<DraftRoom />} />
            <Route path="/draft-testing" element={<DraftTesting />} />
            <Route path="/draft-debug/:id" element={<DraftDebug />} />
            <Route path="/elimination-control/:id" element={<EliminationControl />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/picks" element={<Picks />} />
            <Route path="/waivers" element={<Waivers />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/league/:leagueId/manage" element={<LeagueManagerDashboard />} />
            <Route path="/waiver-processing" element={<WaiverProcessing />} />
                <Route path="/hub" element={<Hub />} />
            <Route path="/browse-leagues" element={<BrowseLeagues />} />
            <Route path="/create-league" element={<CreateLeague />} />
            <Route path="/profile" element={<Profile />} />
              </Route>
              {/* Rutas de administración protegidas */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/testing" element={<TestingDashboard />} />
              </Route>
              {/* Temporary test route */}
              <Route path="/test-realtime" element={<TestRealtime />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
                </BrowserRouter>
                <Toaster />
                <Sonner />
              </AuthProvider>
            </TooltipProvider>
          </MotionConfig>
        </QueryClientProvider>
      </AsyncErrorBoundary>
    </ErrorBoundary>
  );

export default App;
