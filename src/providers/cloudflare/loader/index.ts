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

export function getCfg(cfgFile: string): CloudflareCfg {
  const file = readFileSync(cfgFile, "utf8");
  return parse(file) as CloudflareCfg;
}
