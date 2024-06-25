import * as pulumi from "@pulumi/pulumi";
import * as cf from "@pulumi/cloudflare";
import { DNSCfg, DNSRecordCfg } from "./index";
import { CF_ZONES } from "./../stack";
import { ZoneDNSMap } from "../zone";

export class DNSLoader {
  private dnsCfg: DNSCfg[];

  constructor(dnsCfg: DNSCfg[]) {
    this.dnsCfg = dnsCfg;
  }

  public load(zonesStack: CF_ZONES): ZoneDNSMap {
    const zoneDNSMap = new Map<string, cf.Record[]>();

    this.dnsCfg.forEach((dnsCfg) => {
      const zoneLabel = dnsCfg.zone;

      if (!zonesStack[zoneLabel]) {
        throw new Error(`Zone not found: ${zoneLabel}`);
      }

      const zone = zonesStack[zoneLabel];
      const records = this.loadRecords(zone.id, dnsCfg.records);

      zoneDNSMap.set(zoneLabel, records);
    });

    return zoneDNSMap;
  }

  private loadRecords(
    zoneId: string | pulumi.Output<string>,
    recordsCfg: DNSRecordCfg[],
  ): cf.Record[] {
    const records = recordsCfg.map((recordCfg) => {
      const recordProps: cf.RecordArgs = {
        zoneId: zoneId,
        name: recordCfg.name,
        type: recordCfg.type,
        value: recordCfg.value,
        ttl: recordCfg.ttl,
      };

      if (recordCfg.proxied) {
        recordProps["proxied"] = true;
      }

      if (recordCfg.priority) {
        recordProps["priority"] = recordCfg.priority;
      }

      return new cf.Record(recordCfg.name, recordProps, { protect: true });
    });

    return records;
  }
}
