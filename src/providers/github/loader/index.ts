import { parse } from "yaml";
import { readFileSync } from "fs";
export * from "./repository";
export * from "./team";

export type TeamCfg = {
  name: string;
  description: string;
  members: TeamMemberCfg[];
};

export type TeamMemberCfg = {
  username: string;
  role: string;
};

export type RepositoryCfg = {
  name: string;
  description: string;
  visibility: "public" | "private";
  actionsAccess?: "org";
  teams: RepositoryTeamCfg[];
  environments: string[];
};

export type RepositoryTeamCfg = {
  name: string;
  permission: "pull" | "push" | "maintain" | "admin";
};

export function getTeamCfg(teamCfgFile: string): TeamCfg[] {
  const file = readFileSync(teamCfgFile, "utf8");
  return parse(file) as TeamCfg[];
}

export function getRepositoryCfg(repoCfgFile: string): RepositoryCfg[] {
  const file = readFileSync(repoCfgFile, "utf8");
  return parse(file) as RepositoryCfg[];
}
