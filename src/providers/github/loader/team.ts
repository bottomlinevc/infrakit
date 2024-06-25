/**
 * Takes a list of team configurations and creates a map of team resources.
 */
import { DEFAULT_TEAMS } from "./../config";
import { TeamCfg, TeamMemberCfg } from "./index";
import {
  Team,
  TeamMap,
  newTeam,
  TEAM_ROLE_MEMBER,
  TEAM_ROLE_MAINTAINER,
} from "./../team";

export class TeamLoader {
  private teamsCfg: TeamCfg[];
  private defaultTeams: string[];

  constructor(teamsCfg: TeamCfg[], defaultTeams: string[]) {
    this.teamsCfg = teamsCfg;

    // Merge the incoming default teams with the one in our config for provider
    this.defaultTeams = [...DEFAULT_TEAMS, ...defaultTeams];

    // Add the default teams to the list of teams if it doesn't exist
    this.defaultTeams.forEach((team) => {
      if (!this.teamsCfg.find((cfg) => cfg.name === team)) {
        this.teamsCfg.push({
          name: team,
          description: "",
          members: [],
        });
      }
    });
  }

  public load(): TeamMap {
    const teamMap = new Map<string, Team>();

    this.teamsCfg.forEach((teamCfg) => {
      const team = newTeam(
        teamCfg.name,
        teamCfg.description,
        this.defaultTeams.includes(teamCfg.name),
      );

      this.loadMembers(team, teamCfg.members);

      teamMap.set(teamCfg.name, team);
    });

    return teamMap;
  }

  private loadMembers(team: Team, members: TeamMemberCfg[]): void {
    members.forEach((member) => {
      if (
        member.role !== TEAM_ROLE_MEMBER &&
        member.role !== TEAM_ROLE_MAINTAINER
      ) {
        throw new Error(`Invalid role: ${member.role}`);
      }

      team.addMember(member.username, member.role);
    });
  }
}
