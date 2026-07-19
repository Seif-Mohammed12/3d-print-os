import { useAuthStore } from '../stores/auth-store';

export function usePermissions() {
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);

  const hasPermission = (requiredPermission: string): boolean => {
    return permissions.includes(requiredPermission);
  };

  const hasRole = (requiredRole: string): boolean => {
    return roles.includes(requiredRole);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((perm) => permissions.includes(perm));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every((perm) => permissions.includes(perm));
  };

  return {
    permissions,
    roles,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
  };
}
