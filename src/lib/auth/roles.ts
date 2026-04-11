import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { PERMISSION_TYPES } from "app-types/permissions";

// Combine Better Auth's default statements with our app-specific permissions
const permissions = {
  // Use Better Auth's default statements for user and session management
  ...defaultStatements,
  // Add our app-specific resources
  mcp: [...Object.values(PERMISSION_TYPES)],
  chat: [...Object.values(PERMISSION_TYPES)],
  temporaryChat: [...Object.values(PERMISSION_TYPES)],
};

// Create access control with all permissions
export const ac = createAccessControl(permissions);

// User role: full app permissions but no user management
export const user = ac.newRole({
  user: [],
  session: [],
  mcp: ["create", "view", "update", "delete", "use", "list"],
  chat: [...Object.values(PERMISSION_TYPES)],
  temporaryChat: [...Object.values(PERMISSION_TYPES)],
});

// Admin role: full permissions including user management
export const admin = ac.newRole({
  // Full user and session management permissions from Better Auth defaults
  user: [...defaultStatements.user],
  session: [...defaultStatements.session],
  // Full app permissions
  mcp: [...Object.values(PERMISSION_TYPES)],
  chat: [...Object.values(PERMISSION_TYPES)],
  temporaryChat: [...Object.values(PERMISSION_TYPES)],
});
