import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { RepoEnvironment } from "./environment";
import { getShortHash } from "../utils";

export const REPO_VISIBILITY_PUBLIC = "public";
export const REPO_VISIBILITY_PRIVATE = "private";

export const REPO_PERMISSION_ADMIN = "admin";
export const REPO_PERMISSION_MAINTAIN = "maintain";
export const REPO_PERMISSION_PUSH = "push";
export const REPO_PERMISSION_PULL = "pull";

export type RepoMap = Map<string, Repo>;

export class Repo {
  name: string;
  githubRepo?: github.Repository;
  teams: Map<string, github.TeamRepository>;
  environments: Map<string, RepoEnvironment>;
  variables: Map<string, github.ActionsVariable>;
  secrets: Map<string, github.ActionsSecret>;
  branchProtection: Map<string, github.BranchProtection>;
  webhooks: Map<string, github.RepositoryWebhook>;

  constructor(name: string) {
    this.name = name;

    this.teams = new Map<string, github.TeamRepository>();
    this.environments = new Map<string, RepoEnvironment>();
    this.variables = new Map<string, github.ActionsVariable>();
    this.secrets = new Map<string, github.ActionsSecret>();
    this.branchProtection = new Map<string, github.BranchProtection>();
    this.webhooks = new Map<string, github.RepositoryWebhook>();
  }

  getDependencies(): pulumi.Resource[] {
    const dependencies = [];
    if (this.githubRepo) {
      dependencies.push(this.githubRepo);
    }

    return dependencies;
  }

  addTeam(name: string, permission: string): github.TeamRepository {
    const team = new github.TeamRepository(
      `${this.name}-teams-${name}`,
      {
        repository: this.name,
        teamId: name,
        permission: permission,
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );

    this.teams.set(name, team);

    return team;
  }

  addTeams(teams: Map<string, string>): github.TeamRepository[] {
    return Array.from(teams).map(([name, permission]) => {
      return this.addTeam(name, permission);
    });
  }

  hasEnvironments(environments: string[]): boolean {
    return environments.every((env) => this.environments.has(env));
  }

  addEnvironment(envName: string): RepoEnvironment {
    const repoEnv = new github.RepositoryEnvironment(
      `${this.name}-env-${envName}`,
      {
        repository: this.name,
        environment: envName,
        deploymentBranchPolicy: {
          protectedBranches: false,
          customBranchPolicies: true,
        },
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );

    const environment = new RepoEnvironment(this.name, envName);
    environment.environment = repoEnv;

    this.environments.set(envName, environment);

    return environment;
  }

  addVariable(
    name: string,
    value: pulumi.Output<string> | string,
  ): github.ActionsVariable {
    const variable = new github.ActionsVariable(
      `${this.name}-variable-${name}`,
      {
        repository: this.name,
        variableName: name,
        value: value,
      },
      { deleteBeforeReplace: true, dependsOn: this.getDependencies() },
    );

    this.variables.set(name, variable);

    return variable;
  }

  addVariables(
    variables: Map<string, pulumi.Output<string> | string>,
  ): github.ActionsVariable[] {
    return Array.from(variables).map(([name, value]) => {
      return this.addVariable(name, value);
    });
  }

  addSecret(
    name: string,
    value: pulumi.Output<string> | string,
  ): github.ActionsSecret {
    const secret = new github.ActionsSecret(
      `${this.name}-secret-${name}`,
      {
        repository: this.name,
        secretName: name,
        plaintextValue: value,
      },
      { deleteBeforeReplace: true, dependsOn: this.getDependencies() },
    );

    this.secrets.set(name, secret);

    return secret;
  }

  addSecrets(
    secrets: Map<string, pulumi.Output<string> | string>,
  ): github.ActionsSecret[] {
    return Array.from(secrets).map(([name, value]) => {
      return this.addSecret(name, value);
    });
  }

  addBranchProtection(
    pattern: string,
    allowsDeletions: boolean,
    pushRestrictions?: (string | pulumi.Output<string>)[],
    statusChecks?: (string | pulumi.Output<string>)[],
    pullRequestBypassers?: (string | pulumi.Output<string>)[],
    forcePushBypassers?: (string | pulumi.Output<string>)[],
  ): github.BranchProtection {
    const patternSuffix = getShortHash(pattern);

    const protection = new github.BranchProtection(
      `${this.name}-protection-${patternSuffix}`,
      {
        repositoryId: this.name,
        pattern: pattern,
        enforceAdmins: true,
        requireConversationResolution: true,
        allowsDeletions: allowsDeletions,
        restrictPushes: [
          {
            blocksCreations: false,
            pushAllowances: pushRestrictions,
          },
        ],
        requiredStatusChecks: [
          {
            strict: false,
            contexts: statusChecks,
          },
        ],
        requiredPullRequestReviews: [
          {
            dismissStaleReviews: true,
            requiredApprovingReviewCount: 0,
            pullRequestBypassers: pullRequestBypassers,
          },
        ],
        forcePushBypassers: forcePushBypassers,
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );

    this.branchProtection.set(pattern, protection);

    return protection;
  }

  addWebhook(
    hookName: string,
    url: string | pulumi.Output<string>,
    events: string[],
  ): github.RepositoryWebhook {
    const webhook = new github.RepositoryWebhook(
      `${this.name}-webhook-${hookName}`,
      {
        repository: this.name,
        configuration: {
          url: url,
          contentType: "json",
          secret: "",
        },
        events: events,
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );

    this.webhooks.set(hookName, webhook);

    return webhook;
  }

  createSharedWorkflow(): github.ActionsRepositoryAccessLevel {
    return new github.ActionsRepositoryAccessLevel(
      `${this.name}-action-access-level`,
      {
        repository: this.name,
        accessLevel: "organization",
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );
  }
}

export function newRepo(
  name: string,
  description: string,
  visibility: "public" | "private",
): Repo {
  const repo = new Repo(name);
  repo.githubRepo = new github.Repository(
    name,
    {
      name: name,
      visibility: visibility,
      description: description ?? "",
      vulnerabilityAlerts: true,
    },
    {
      protect: true, // Always protect github repositories
    },
  );

  return repo;
}
