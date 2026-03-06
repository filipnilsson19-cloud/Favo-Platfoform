export const appRoleOptions = ["admin", "personal"] as const;

export type AppRole = (typeof appRoleOptions)[number];

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
};
