import * as cf from "@pulumi/cloudflare";
import { CloudflareCfg, AccountCfg, ZoneCfg } from "./index";
import { ZoneMap } from "./../zone";

export class ZoneLoader {
  private accountCfg: AccountCfg;
  private zonesCfg: ZoneCfg[];

  constructor(cloudflareCfg: CloudflareCfg) {
    this.accountCfg = cloudflareCfg.account;
    this.zonesCfg = cloudflareCfg.zones;
  }

  public load(): ZoneMap {
    const zoneMap = new Map<string, cf.Zone>();

    this.zonesCfg.forEach((zoneCfg) => {
      const zone = new cf.Zone(
        zoneCfg.label,
        {
          accountId: this.accountCfg.accountId,
          zone: zoneCfg.name,
        },
        { protect: true },
      );

      new cf.ZoneSettingsOverride(
        `${zoneCfg.label}-zone-settings`,
        {
          zoneId: zone.id,
          settings: {
            ssl: "full",
            alwaysUseHttps: "on",
          },
        },
        { protect: true },
      );

      zoneMap.set(zoneCfg.label, zone);
    });

    return zoneMap;
  }
}
