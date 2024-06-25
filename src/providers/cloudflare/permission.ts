import * as cf from "@pulumi/cloudflare";

const allPermissions = cf.getApiTokenPermissionGroups({});
export const PERM_DNS_READ = allPermissions.then(
  (all) => all.zone?.["DNS Read"],
);
export const PERM_DNS_WRITE = allPermissions.then(
  (all) => all.zone?.["DNS Write"],
);

export const PERM_WORKERS_ROUTES_READ = allPermissions.then(
  (all) => all.zone?.["Workers Routes Read"],
);
export const PERM_WORKERS_ROUTES_EDIT = allPermissions.then(
  (all) => all.zone?.["Workers Routes Write"],
);

export const PERM_WORKERS_SCRIPT_EDIT = allPermissions.then(
  (all) => all.account?.["Workers Scripts Write"],
);
export const PERM_WORKERS_SCRIPT_READ = allPermissions.then(
  (all) => all.account?.["Workers Scripts Read"],
);

export const PERM_WORKERS_KV_READ = allPermissions.then(
  (all) => all.account?.["Workers KV Storage Read"],
);
export const PERM_WORKERS_KV_WRITE = allPermissions.then(
  (all) => all.account?.["Workers KV Storage Write"],
);

export const PERM_PAGERULES_READ = allPermissions.then(
  (all) => all.zone?.["Page Rules Read"],
);
export const PERM_PAGERULES_WRITE = allPermissions.then(
  (all) => all.zone?.["Page Rules Write"],
);

export const PERM_PAGES_READ = allPermissions.then(
  (all) => all.account?.["Pages Read"],
);
export const PERM_PAGES_WRITE = allPermissions.then(
  (all) => all.account?.["Pages Write"],
);

export const PERM_USER_MEMBERSHIPS_READ = allPermissions.then(
  (all) => all.user?.["Memberships Read"],
);
