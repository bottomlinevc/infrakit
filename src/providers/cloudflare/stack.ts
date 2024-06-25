import * as pulumi from "@pulumi/pulumi";
import { ZoneMap } from "./zone";

export type CF_ZONE = {
  label: pulumi.Output<string> | string;
  name: pulumi.Output<string> | string;
  id: pulumi.Output<string> | string;
};

export type CF_ZONES = {
  [zoneLabel: string]: CF_ZONE;
};

// Export the zones for use in other projects
export function exportZones(zones: ZoneMap): CF_ZONES {
  const zoneList: CF_ZONES = {};

  for (const [zoneLabel, zoneObj] of zones) {
    zoneList[zoneLabel] = {
      label: pulumi.output(zoneLabel),
      name: pulumi.output(zoneObj.zone),
      id: pulumi.output(zoneObj.id),
    };
  }

  return zoneList;
}

export async function getZonesFromStack(
  org: string,
  project: string,
): Promise<Map<string, CF_ZONE>> {
  // We don't create zones in sandbox mode, so this is scoped to prod
  const stackRef = new pulumi.StackReference(`${org}/${project}/prod`);

  const stackZones = (await stackRef.getOutputDetails("CF_ZONES"))
    .value as CF_ZONES;

  if (!stackZones) {
    throw new Error("CF_ZONES not found in stack output");
  }

  const zoneMap = new Map<string, CF_ZONE>();

  for (const [zoneLabel, zone] of Object.entries(stackZones)) {
    zoneMap.set(zoneLabel, {
      label: pulumi.output(zone.label),
      name: pulumi.output(zone.name),
      id: pulumi.output(zone.id),
    });
  }

  return zoneMap;
}
