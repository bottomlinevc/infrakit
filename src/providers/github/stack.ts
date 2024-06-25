import * as pulumi from "@pulumi/pulumi";
import { TeamMap, Team } from "./team";
import { DEFAULT_TEAMS } from "./config";

export type GH_TEAM = {
  id: pulumi.Output<string> | string;
  slug: pulumi.Output<string> | string;
  isDefault: boolean;
};

export type GH_TEAMS = {
  [teamName: string]: GH_TEAM;
};

// Export the teams for use in other projects
export function exportTeams(teams: TeamMap): GH_TEAMS {
  const teamList: GH_TEAMS = {};

  for (const [teamName, teamObj] of teams) {
    teamList[teamName] = {
      id: pulumi.output(teamObj.id),
      slug: pulumi.output(teamObj.slug),
      isDefault: teamObj.isDefault,
    };
  }

  return teamList;
}

export async function getTeamsFromStack(
  org: string,
  project: string,
  names: string[],
): Promise<TeamMap> {
  // We don't create teams in sandbox mode, so this is scoped to prod
  const stackRef = new pulumi.StackReference(`${org}/${project}/prod`);

  // Teams exported from the infrastructure production stack
  const stackTeams = (await stackRef.getOutputDetails("GH_TEAMS"))
    .value as GH_TEAMS;

  if (!stackTeams) {
    throw new Error("GH_TEAMS not found in stack output");
  }

  const teamMap = new Map<string, Team>();

  const finalTeams = [...DEFAULT_TEAMS, ...names];

  finalTeams.forEach((team) => {
    if (!stackTeams[team]) {
      throw new Error(`Team not found: ${team}${JSON.stringify(stackTeams)}`);
    }

    teamMap.set(
      team,
      new Team(
        team,
        stackTeams[team].isDefault,
        stackTeams[team].id,
        stackTeams[team].slug,
      ),
    );
  });

  return teamMap;
}
