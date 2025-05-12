
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Draft from "./pages/Draft";
import Standings from "./pages/Standings";
import Picks from "./pages/Picks";
import Waivers from "./pages/Waivers";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Hub from "./pages/Hub";
import BrowseLeagues from "./pages/BrowseLeagues";
import CreateLeague from "./pages/CreateLeague";
import Profile from "./pages/Profile";
import { AuthProvider } from "@/hooks/useAuth";
import PrivateRoute from "@/components/PrivateRoute";

const queryClient = new QueryClient();

const App = () => (
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
              <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/draft" element={<Draft />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/picks" element={<Picks />} />
            <Route path="/waivers" element={<Waivers />} />
                <Route path="/hub" element={<Hub />} />
            <Route path="/browse-leagues" element={<BrowseLeagues />} />
            <Route path="/create-league" element={<CreateLeague />} />
            <Route path="/profile" element={<Profile />} />
              </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
        </AuthProvider>
      </TooltipProvider>
    </MotionConfig>
  </QueryClientProvider>
);

export default App;
