import { AppSettings, RolePermissions, UserRole } from '../types';

const SETTINGS_STORAGE_KEY = 'the_commissary_app_settings_v1';

export const defaultRolePermissions: Record<string, RolePermissions> = {
  'Super Admin': {
    canCount: true,
    canOrder: true,
    canDownloadExcel: true,
    canEmailOrders: true,
    canViewCosts: true,
    canEditParLevels: true,
    canUploadForms: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageSettings: true
  },
  'District Manager': {
    canCount: true,
    canOrder: true,
    canDownloadExcel: true,
    canEmailOrders: true,
    canViewCosts: true,
    canEditParLevels: true,
    canUploadForms: true,
    canAccessAdmin: true,
    canManageUsers: false,
    canManageSettings: false
  },
  'Manager': {
    canCount: true,
    canOrder: true,
    canDownloadExcel: true,
    canEmailOrders: true,
    canViewCosts: true,
    canEditParLevels: true,
    canUploadForms: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canManageSettings: false
  },
  'Cashier': {
    canCount: true,
    canOrder: true,
    canDownloadExcel: false,
    canEmailOrders: false,
    canViewCosts: false,
    canEditParLevels: false,
    canUploadForms: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canManageSettings: false
  },
  'Cook': {
    canCount: true,
    canOrder: true,
    canDownloadExcel: false,
    canEmailOrders: false,
    canViewCosts: false,
    canEditParLevels: false,
    canUploadForms: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canManageSettings: false
  },
  'Employee': {
    canCount: true,
    canOrder: false,
    canDownloadExcel: false,
    canEmailOrders: false,
    canViewCosts: false,
    canEditParLevels: false,
    canUploadForms: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canManageSettings: false
  },
  'Admin': {
    canCount: true,
    canOrder: true,
    canDownloadExcel: true,
    canEmailOrders: true,
    canViewCosts: true,
    canEditParLevels: true,
    canUploadForms: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageSettings: false
  }
};

export const defaultAppSettings: AppSettings = {
  orderEmailRecipient: 'michael.goyone@gmail.com',
  footerFormatTemplate: '[FILENAME]_[DATE]_[INITIALS] ([INITIALS] [DATE_SLASH])',
  rolePermissions: defaultRolePermissions
};

export function getAppSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultAppSettings,
        ...parsed,
        rolePermissions: {
          ...defaultRolePermissions,
          ...(parsed.rolePermissions || {})
        }
      };
    }
  } catch (e) {
    console.error('Failed reading app settings:', e);
  }
  return defaultAppSettings;
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const updated: AppSettings = {
    ...current,
    ...settings,
    rolePermissions: {
      ...current.rolePermissions,
      ...(settings.rolePermissions || {})
    }
  };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed saving app settings:', e);
  }
  return updated;
}

export function hasPermission(role: string, permission: keyof RolePermissions): boolean {
  if (role === 'Super Admin') return true;
  const settings = getAppSettings();
  const perms = settings.rolePermissions[role] || defaultRolePermissions[role] || defaultRolePermissions['Employee'];
  return !!perms[permission];
}

/**
 * Extract user initials from full name (e.g. "Michael Goyone" => "MG")
 */
export function getUserInitials(name: string): string {
  if (!name) return 'MG';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
