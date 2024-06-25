import * as cf from "@pulumi/cloudflare";

export type ZoneMap = Map<string, cf.Zone>;

export type ZoneDNSMap = Map<string, cf.Record[]>;
