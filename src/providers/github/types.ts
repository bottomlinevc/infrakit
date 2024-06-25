import * as pulumi from "@pulumi/pulumi";

export type GH_TEAM = {
  id: pulumi.Output<string> | string;
  slug: pulumi.Output<string> | string;
  isDefault: boolean;
};

export type GH_TEAMS = {
  [teamName: string]: GH_TEAM;
};
