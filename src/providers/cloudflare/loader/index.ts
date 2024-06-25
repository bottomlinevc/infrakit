import { parse } from "yaml";
import { readFileSync } from "fs";

export type AccountCfg = {
  accountId: string;
  userId: string;
};

export type ZoneCfg = {
  name: string;
  label: string;
};

export type CloudflareCfg = {
  account: AccountCfg;
  zones: ZoneCfg[];
};

export type DNSCfg = {
  zone: string;
  records: DNSRecordCfg[];
};

export type DNSRecordCfg = {
  label: string;
  name: string;
  type: string;
  ttl: number;
  value: string;
  priority?: number;
  proxied?: boolean;
};

export function getZoneCfg(cfgFile: string): CloudflareCfg {
  const file = readFileSync(cfgFile, "utf8");
  return parse(file) as CloudflareCfg;
}

export function getDNSCfg(cfgFile: string): DNSCfg[] {
  const file = readFileSync(cfgFile, "utf8");
  return parse(file) as DNSCfg[];
}
