import { useAuth } from "@/hooks/useAuth";

// Hook básico para verificar si el usuario actual es administrador
// Esta es una implementación temporal hasta que se aplique la migración
export function useIsAdmin() {
  const { user } = useAuth();

  // Get admin emails from environment variable
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map((email: string) => email.trim()) || [];
  
  // Add default admin check for development
  const defaultAdminChecks = user?.email?.includes("admin");

  // Verificación temporal basada en email
  // Esto se reemplazará con la función SQL is_admin() después de la migración
  const isAdmin =
    user &&
    (defaultAdminChecks || adminEmails.includes(user.email || ''));

  return {
    data: !!isAdmin,
    isLoading: false,
    error: null,
  };
}

// Hook para verificar permisos básicos
export function useHasAdminPermissions() {
  const { data: isAdmin } = useIsAdmin();

  return {
    canManageUsers: isAdmin,
    canManageLeagues: isAdmin,
    canEditPlayers: isAdmin,
    canViewAdminPanel: isAdmin,
  };
}
