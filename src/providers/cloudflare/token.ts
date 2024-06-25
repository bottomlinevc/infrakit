import * as pulumi from "@pulumi/pulumi";
import * as cf from "@pulumi/cloudflare";
import {
  PERM_DNS_READ,
  PERM_DNS_WRITE,
  PERM_WORKERS_ROUTES_READ,
  PERM_WORKERS_ROUTES_EDIT,
  PERM_PAGERULES_READ,
  PERM_PAGERULES_WRITE,
  PERM_WORKERS_SCRIPT_READ,
  PERM_WORKERS_SCRIPT_EDIT,
  PERM_WORKERS_KV_READ,
  PERM_WORKERS_KV_WRITE,
  PERM_PAGES_READ,
  PERM_PAGES_WRITE,
  PERM_USER_MEMBERSHIPS_READ,
} from "./permission";
import { config } from "./config";

// Create a token with custom permissions
export function newToken(
  config: config,
  name: string,
  zones: cf.Zone[],
  zonePermissions: Promise<string>[],
  accountPermissions?: Promise<string>[],
  userPermissions?: Promise<string>[],
): cf.ApiToken {
  const tokenName = `${config.org}-${name}-${config.tokenHash}`;

  const zoneIds = zones.map((zone) => zone.id);

  const policies = [
    {
      effect: "allow",
      permissionGroups: zonePermissions,
      resources: pulumi.all(zoneIds).apply((zoneIds) => {
        const zoneResources: Record<string, string> = {};
        zoneIds.forEach((zoneId) => {
          zoneResources[`com.cloudflare.api.account.zone.${zoneId}`] = "*";
        });

        return zoneResources;
      }),
    },
  ];

  if (accountPermissions) {
    policies.push({
      effect: "allow",
      permissionGroups: accountPermissions,
      resources: pulumi.all([config.accountId]).apply(([accountId]) => {
        return {
          [`com.cloudflare.api.account.${accountId}`]: "*",
        };
      }),
    });
  }

  if (userPermissions) {
    policies.push({
      effect: "allow",
      permissionGroups: userPermissions,
      resources: pulumi.all([config.userId]).apply(([userId]) => {
        return {
          [`com.cloudflare.api.user.${userId}`]: "*",
        };
      }),
    });
  }

  return new cf.ApiToken(tokenName, {
    name: tokenName,
    policies,
  });
}

// Create a token for creation of workers, routes, KV etc.
export function newWorkerToken(
  config: config,
  name: string,
  zones: cf.Zone[],
): cf.ApiToken {
  return newToken(
    config,
    name,
    zones,
    [
      PERM_DNS_READ,
      PERM_DNS_WRITE,

      PERM_WORKERS_ROUTES_READ,
      PERM_WORKERS_ROUTES_EDIT,
    ],
    [
      PERM_WORKERS_SCRIPT_READ,
      PERM_WORKERS_SCRIPT_EDIT,

      PERM_WORKERS_KV_READ,
      PERM_WORKERS_KV_WRITE,
    ],
  );
}

// Create a higher privileged token for creation of workers along with pages and pagerules
export function newWorkerPagesToken(
  config: config,
  name: string,
  zones: cf.Zone[],
): cf.ApiToken {
  return newToken(
    config,
    name,
    zones,
    [
      PERM_DNS_READ,
      PERM_DNS_WRITE,

      PERM_WORKERS_ROUTES_READ,
      PERM_WORKERS_ROUTES_EDIT,

      PERM_PAGERULES_READ,
      PERM_PAGERULES_WRITE,
    ],
    [
      PERM_WORKERS_SCRIPT_READ,
      PERM_WORKERS_SCRIPT_EDIT,

      PERM_WORKERS_KV_READ,
      PERM_WORKERS_KV_WRITE,

      PERM_PAGES_READ,
      PERM_PAGES_WRITE,
    ],
  );
}

// Create a token for deployment of workers
export function newWorkerDeploymentToken(
  config: config,
  name: string,
  zones: cf.Zone[],
): cf.ApiToken {
  return newToken(
    config,
    name,
    zones,
    [PERM_WORKERS_ROUTES_READ],
    [PERM_WORKERS_SCRIPT_READ, PERM_WORKERS_SCRIPT_EDIT],
    [PERM_USER_MEMBERSHIPS_READ],
  );
}

// Create a token for DNS management
export function newDNSToken(
  config: config,
  name: string,
  zones: cf.Zone[],
): cf.ApiToken {
  return newToken(config, name, zones, [PERM_DNS_READ, PERM_DNS_WRITE]);
}
