import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function PrivateRoute() {
  const { user, loading } = useAuth();
  if (loading) return null; // O un spinner
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
} 