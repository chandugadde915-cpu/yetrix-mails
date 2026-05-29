export {
  defaultDashboardForRole,
  normalizeAppRole as normalizeRole,
  type AppRole as WorkspaceRole,
  type NavigationItem as NavItem,
  type NavigationSection as NavSection,
} from "./authz";

import { navigationForUser } from "./authz";

export function navForRole(role?: string | null) {
  return navigationForUser({ role });
}
