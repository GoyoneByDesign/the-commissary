import { AppSettings, RolePermissions, JobCodeDefinition, UserRole } from '../types';

const SETTINGS_STORAGE_KEY = 'the_commissary_app_settings_v1';

export const defaultJobCodes: JobCodeDefinition[] = [
  {
    code: 'EXEC-01',
    title: 'Super Admin',
    role: 'Super Admin',
    department: 'Executive',
    description: 'Master administrative authority over all company locations, checksheets, users, and financials.',
    color: '#f59e0b',
    isSystemProtected: true
  },
  {
    code: 'DM-02',
    title: 'District Manager',
    role: 'District Manager',
    department: 'Operations',
    description: 'Multi-store oversight, checksheet validation, ordering verification, and variance audits.',
    color: '#6366f1'
  },
  {
    code: 'GM-03',
    title: 'General Manager',
    role: 'Manager',
    department: 'Operations',
    description: 'Store manager on duty. Completes official inventory, reviews food par levels, and finalizes orders.',
    color: '#10b981'
  },
  {
    code: 'AM-04',
    title: 'Assistant Manager',
    role: 'Manager',
    department: 'Operations',
    description: 'Shift supervisor assisting in inventory counts, section checklists, and receiving goods.',
    color: '#06b6d4'
  },
  {
    code: 'FOH-05',
    title: 'Cashier / Front of House',
    role: 'Cashier',
    department: 'Front of House',
    description: 'Fast hands-free voice counting and manual counting of front cooler, dry storage, and bar supplies.',
    color: '#ec4899'
  },
  {
    code: 'BOH-06',
    title: 'Cook / Kitchen Staff',
    role: 'Cook',
    department: 'Back of House',
    description: 'Sub-zero freezer and walk-in cooler inventory counts by voice. Simplified counting and ordering.',
    color: '#f97316'
  },
  {
    code: 'LOG-07',
    title: 'Commissary Logistics',
    role: 'Admin',
    department: 'Logistics',
    description: 'Central commissary inventory tracking, bulk distribution, and wholesale invoice management.',
    color: '#8b5cf6'
  }
];

export const defaultRolePermissions: Record<string, RolePermissions> = {
  'Super Admin': {
    canCount: true,
    canOrder: true,
    canManageForms: true, // Only Michael Goyone has this by default!
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
    canManageForms: false,
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
    canManageForms: false,
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
    canManageForms: false,
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
    canManageForms: false,
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
    canManageForms: false,
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
    canManageForms: true,
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
  rolePermissions: defaultRolePermissions,
  jobCodes: defaultJobCodes
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
        },
        jobCodes: parsed.jobCodes && parsed.jobCodes.length > 0 ? parsed.jobCodes : defaultJobCodes
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
    },
    jobCodes: settings.jobCodes || current.jobCodes || defaultJobCodes
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
