import { useAuth } from "@/hooks/useAuth";

// Hook básico para verificar si el usuario actual es administrador
// Esta es una implementación temporal hasta que se aplique la migración
export function useIsAdmin() {
  const { user } = useAuth();

  // Verificación temporal basada en email
  // Esto se reemplazará con la función SQL is_admin() después de la migración
  const isAdmin =
    user &&
    (user.email?.includes("admin") ||
      user.email === "juanlopezlmg@gmail.com" || // Cambiar por tu email
      user.email === "admin@lastsurvive.com");

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
