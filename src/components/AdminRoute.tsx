import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdminBasic";
import { Loader2 } from "lucide-react";

export default function AdminRoute() {
  const { user, loading } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-nfl-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-nfl-blue" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-nfl-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acceso Denegado</h1>
          <p className="text-gray-400 mb-6">No tienes permisos de administrador</p>
          <Navigate to="/hub" replace />
        </div>
      </div>
    );
  }

  return <Outlet />;
} 