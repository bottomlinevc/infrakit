import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";

export type TeamMap = Map<string, Team>;

export const TEAM_ROLE_MEMBER = "member";
export const TEAM_ROLE_MAINTAINER = "maintainer";

export class Team {
  name: string;
  isDefault: boolean;
  id: string | pulumi.Output<string>;
  slug: string | pulumi.Output<string>;
  githubTeam?: github.Team;
  memberships: Map<string, github.TeamMembership>;

  constructor(
    name: string,
    isDefault?: boolean,
    id?: string | pulumi.Output<string>,
    slug?: string | pulumi.Output<string>,
  ) {
    this.name = name;
    this.isDefault = isDefault || false;
    this.id = id || "";
    this.slug = slug || "";

    this.memberships = new Map<string, github.TeamMembership>();
  }

  addMember(
    username: string,
    role: "member" | "maintainer",
  ): github.TeamMembership {
    if (!this.githubTeam) {
      throw new Error(`Team not found: ${this.name}`);
    } else if (role !== "member" && role !== "maintainer") {
      throw new Error(`Invalid role: ${role}`);
    }

    const teamMembership = new github.TeamMembership(
      `team-${this.name}-${username}-membership`,
      {
        teamId: this.id,
        username: username,
        role: role,
      },
      { deleteBeforeReplace: true },
    );

    this.memberships.set(username, teamMembership);

    return teamMembership;
  }
}

export function newTeam(
  name: string,
  description: string,
  isDefault: boolean,
): Team {
  const team = new Team(name, isDefault);
  team.githubTeam = new github.Team(
    `team-${name}`,
    {
      name: name,
      description: description,
      privacy: "closed",
    },
    {
      protect: isDefault, // We protect the default teams
    },
  );

  team.id = team.githubTeam.id;
  team.slug = team.githubTeam.slug;

  return team;
}
