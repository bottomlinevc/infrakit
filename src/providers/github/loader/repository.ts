import * as pulumi from "@pulumi/pulumi";
import { RepositoryCfg } from "./index";
import {
  TEAM_ADMIN,
  DEFAULT_TEAMS,
  ENV_SANDBOX,
  ENV_PRODUCTION,
} from "./../config";
import { TeamMap } from "./../team";
import {
  Repo,
  RepoMap,
  newRepo,
  REPO_VISIBILITY_PUBLIC,
  REPO_VISIBILITY_PRIVATE,
  REPO_PERMISSION_PULL,
  REPO_PERMISSION_PUSH,
  REPO_PERMISSION_MAINTAIN,
  REPO_PERMISSION_ADMIN,
} from "./../repository";

export type StatusCheck = Map<string, string[]>; // Branch > checks[]
export type Hook = { url: pulumi.Output<string> | string; events: string[] };
export type Webhook = Map<string, Hook>;
export type Secret = Map<string, pulumi.Output<string> | string>;
export type Variable = Map<string, pulumi.Output<string> | string>;

export class RepoLoader {
  private githubOrg: string;
  private repositoriesCfg: RepositoryCfg[];
  private teamsMap: TeamMap;
  private defaultTeams: string[];

  // These are all global
  private repoEnvDeploymentBranches = new Map<string, string[]>();
  private variables: Variable = new Map<
    string,
    string | pulumi.Output<string>
  >();
  private secrets: Secret = new Map<string, string | pulumi.Output<string>>();
  private webhooks: Webhook = new Map<string, Hook>();

  // These are scoped to repo
  private repoVariables = new Map<string, Variable>();
  private repoSecrets = new Map<string, Secret>();
  private repoWebhooks = new Map<string, Webhook>();
  private repoStatusChecks = new Map<string, StatusCheck>(); // Repo > StatusCheck[]

  constructor(
    githubOrg: string,
    repositoriesCfg: RepositoryCfg[],
    teamsMap: TeamMap,
    defaultTeams: string[],
  ) {
    this.githubOrg = githubOrg;

    // Merge the incoming default teams with the one in our config for provider
    const finalDefaultTeams = [...DEFAULT_TEAMS, ...defaultTeams];
    // Ensure the default teams were created and supplied in the Team map
    finalDefaultTeams.forEach((team) => {
      if (!teamsMap.has(team)) {
        throw new Error(`Core team not found: ${team}`);
      }
    });

    this.repositoriesCfg = repositoriesCfg;
    this.teamsMap = teamsMap;
    this.defaultTeams = finalDefaultTeams;
  }

  public addVariable(
    name: string,
    value: string | pulumi.Output<string>,
    repo?: string,
  ): void {
    if (repo) {
      if (!this.repoVariables.has(repo)) {
        this.repoVariables.set(repo, new Map<string, pulumi.Output<string>>());
      }
      const repoVariables = this.repoVariables.get(repo);
      if (repoVariables) {
        repoVariables.set(name, value);
      }
    } else {
      this.variables.set(name, value);
    }
  }

  public addVariables(
    variables: Map<string, string | pulumi.Output<string>>,
    repo?: string,
  ): void {
    variables.forEach((value, name) => {
      this.addVariable(name, value, repo);
    });
  }

  public addSecret(
    name: string,
    value: string | pulumi.Output<string>,
    repo?: string,
  ): void {
    if (repo) {
      if (!this.repoSecrets.has(repo)) {
        this.repoSecrets.set(repo, new Map<string, pulumi.Output<string>>());
      }
      const repoSecrets = this.repoSecrets.get(repo);
      if (repoSecrets) {
        repoSecrets.set(name, value);
      }
    } else {
      this.secrets.set(name, value);
    }
  }

  public addSecrets(
    secrets: Map<string, string | pulumi.Output<string>>,
    repo?: string,
  ): void {
    secrets.forEach((value, name) => {
      this.addSecret(name, value, repo);
    });
  }

  public addWebhook(
    name: string,
    url: string | pulumi.Output<string>,
    events: string[],
    repo?: string,
  ): void {
    if (repo) {
      if (!this.repoWebhooks.has(repo)) {
        this.repoWebhooks.set(repo, new Map<string, Hook>());
      }
      const repoWebhooks = this.repoWebhooks.get(repo);
      if (repoWebhooks) {
        repoWebhooks.set(name, { url, events });
      }
    } else {
      this.webhooks.set(name, { url, events });
    }
  }

  public addStatusChecks(
    branchName: string,
    checks: string[],
    repo?: string,
  ): void {
    if (!repo) {
      repo = "*";
    }

    if (!this.repoStatusChecks.has(repo)) {
      this.repoStatusChecks.set(repo, new Map<string, string[]>());
    }
    const repoStatusChecks = this.repoStatusChecks.get(repo);
    if (repoStatusChecks) {
      repoStatusChecks.set(branchName, checks);
    }
  }

  public load(): RepoMap {
    const repoMap: RepoMap = new Map<string, Repo>();

    this.repositoriesCfg.forEach((repoCfg) => {
      const repo = this.newRepoFromCfg(repoCfg);

      repo.addTeams(
        this.getRepoTeamsFromCfg(repoCfg, this.teamsMap, this.defaultTeams),
      );

      if (repoCfg.actionsAccess && repoCfg.actionsAccess === "org") {
        repo.createSharedWorkflow();
      }

      this.createEnvironments(repoCfg, repo);
      this.createVariables(repo);
      this.createSecrets(repo);
      this.createBranchProtection(repo);
      this.createWebhooks(repo);

      repoMap.set(repoCfg.name, repo);
    });

    return repoMap;
  }

  private newRepoFromCfg(repoCfg: RepositoryCfg): Repo {
    if (repoCfg.name === "") {
      throw new Error(`Invalid repository name: ${repoCfg.name}`);
    } else if (
      repoCfg.visibility !== REPO_VISIBILITY_PUBLIC &&
      repoCfg.visibility !== REPO_VISIBILITY_PRIVATE
    ) {
      throw new Error(
        `Invalid repository visibility: ${repoCfg.visibility} for repository: ${repoCfg.name}`,
      );
    }
    const description = repoCfg.description || "";

    return newRepo(repoCfg.name, description, repoCfg.visibility);
  }

  // Returns a map of teams with default teams included
  // Repositories config can have no teams assigned
  // so we ensure that the default teams are included
  private getRepoTeamsFromCfg(
    repoCfg: RepositoryCfg,
    teamsMap: TeamMap,
    defaultTeams: string[],
  ): Map<string, string> {
    const repoTeams = new Map<string, string>();

    repoCfg.teams?.forEach((team) => {
      if (!teamsMap.has(team.name)) {
        throw new Error(`Team not found: ${team.name}`);
      } else if (
        team.permission !== REPO_PERMISSION_PULL &&
        team.permission !== REPO_PERMISSION_PUSH &&
        team.permission !== REPO_PERMISSION_MAINTAIN &&
        team.permission !== REPO_PERMISSION_ADMIN
      ) {
        throw new Error(
          `Invalid permission: ${team.permission} for team: ${team.name}`,
        );
      }

      repoTeams.set(team.name, team.permission);
    });

    defaultTeams.forEach((team) => {
      if (repoTeams.has(team)) {
        return;
      }

      let permission = REPO_PERMISSION_MAINTAIN;
      // Admin team will always have admin permissions
      if (team === TEAM_ADMIN) {
        permission = REPO_PERMISSION_ADMIN;
      }

      repoTeams.set(team, permission);
    });

    return repoTeams;
  }

  private createVariables(repo: Repo): void {
    const repoVariables = this.repoVariables.get(repo.name);

    this.variables.forEach((value, name) => {
      // Ignore the global variable if we have a repo version of it
      if (repoVariables && repoVariables.has(name)) {
        return;
      }

      repo.addVariable(name, value);
    });

    if (repoVariables) {
      repoVariables.forEach((value, name) => {
        repo.addVariable(name, value);
      });
    }
  }

  private createSecrets(repo: Repo): void {
    const repoSecrets = this.repoSecrets.get(repo.name);

    this.secrets.forEach((value, name) => {
      // Ignore the global secret if we have a repo version of it
      if (repoSecrets && repoSecrets.has(name)) {
        return;
      }

      repo.addSecret(name, value);
    });

    if (repoSecrets) {
      repoSecrets.forEach((value, name) => {
        repo.addSecret(name, value);
      });
    }
  }

  private createEnvironments(repoCfg: RepositoryCfg, repo: Repo): void {
    if (repoCfg.environments == undefined) {
      return;
    }

    repo.addVariable("REPO_ENVIRONMENTS", JSON.stringify(repoCfg.environments));

    // Do we have a sandbox environment or do we directly deploy to production?
    let hasSandbox = false;
    if (repoCfg.environments.includes(ENV_SANDBOX)) hasSandbox = true;

    // This is the environment against which we compare pull requests
    // If the repository has a sandbox environment, we compare against that
    // Otherwise, we compare against production
    if (hasSandbox) {
      repo.addVariable("REPO_ENV_COMPARISON", ENV_SANDBOX);
    } else {
      repo.addVariable("REPO_ENV_COMPARISON", ENV_PRODUCTION);
    }

    repoCfg.environments.forEach((env) => {
      const repoEnv = repo.addEnvironment(env);

      const branchPatterns = this.repoEnvDeploymentBranches.get(env);
      if (branchPatterns === undefined)
        throw new Error(`Branch patterns not found for environment: ${env}`);

      const patterns = [...branchPatterns]; // Shallow copy to prevent duplication of main map value

      // Allow deployments to production from any branch if the sandbox env doesn't exist
      if (env === ENV_PRODUCTION && !hasSandbox) patterns.push("*/*");

      for (const branchPattern of patterns) {
        repoEnv.addDeploymentPolicy(branchPattern);
      }
    });
  }

  private getTeamsThatCanPush(repo: Repo): pulumi.Output<string>[] {
    const pushRestrictions: pulumi.Output<string>[] = [];

    // Allow all default teams to push to the repository
    this.defaultTeams.forEach((teamName) => {
      const team = this.teamsMap.get(teamName);
      if (team === undefined) {
        throw new Error(`Team not found: ${teamName}`);
      }

      pushRestrictions.push(pulumi.interpolate`${this.githubOrg}/${team.slug}`);
    });

    // We also need to allow teams that are specifically assigned to repo
    // to push to the repository
    if (repo.teams.size > 0) {
      Array.from(repo.teams.keys()).forEach((teamName) => {
        const team = this.teamsMap.get(teamName);
        if (team === undefined) {
          throw new Error(`Team not found: ${teamName}`);
        }

        pushRestrictions.push(
          pulumi.interpolate`${this.githubOrg}/${team.slug}`,
        );
      });
    }

    return pushRestrictions;
  }

  private getTeamsThatCanBypassPullRequestChecks(): pulumi.Output<string>[] {
    const pullRequestBypassers: pulumi.Output<string>[] = [];

    // Following has been disabled till its actually needed
    // To implement, you will need to add orgOwner to constructor
    // and then use the value in the interpolation below
    //
    // Allow the org admin to always bypass pull request reviews
    // const pullRequestBypassers: pulumi.Output<string>[] = [
    //   pulumi.output(`/${ORG_OWNER}`),
    // ];

    // Allow the admin team to bypass pull request reviews
    const adminTeam = this.teamsMap.get(TEAM_ADMIN);
    if (adminTeam === undefined) {
      throw new Error(`Team not found: ${TEAM_ADMIN}`);
    }
    pullRequestBypassers.push(
      pulumi.interpolate`${this.githubOrg}/${adminTeam.slug}`,
    );

    return pullRequestBypassers;
  }

  private getTeamsThatCanForcePush(): pulumi.Output<string>[] {
    // We allow the admin team to bypass force push restrictions
    const bypassTeams: string[] = [TEAM_ADMIN];

    const forcePushBypassers: pulumi.Output<string>[] = [];
    if (bypassTeams) {
      bypassTeams.forEach((teamName) => {
        const team = this.teamsMap.get(teamName);
        if (team === undefined) {
          throw new Error(`Team not found: ${teamName}`);
        }

        forcePushBypassers.push(
          pulumi.interpolate`${this.githubOrg}/${team.slug}`,
        );
      });
    }

    return forcePushBypassers;
  }

  private createBranchProtection(repo: Repo): void {
    type DEFAULT_BRANCH_PROTECTION = {
      pattern: string;
      allowsDeletions: boolean;
      statusChecks?: string[];
    };

    const defaultBranchProtections: DEFAULT_BRANCH_PROTECTION[] = [];

    let repoStatusCheck = this.repoStatusChecks.get(repo.name);
    // If we failed to get the status checks for this repo,
    // we try to get the default status checks
    if (repoStatusCheck === undefined) {
      repoStatusCheck = this.repoStatusChecks.get("*");
    }

    // Uncomment this when you want to start restricting commits
    // to the main branch. This should be when you have a large team.
    // const statusChecksMain = repoStatusCheck?.get("main") || [];
    // defaultBranchProtections.push({
    //   pattern: "main",
    //   allowsDeletions: false,
    //   statusChecks: statusChecksMain,
    // });

    if (repo.environments.size > 0) {
      Array.from(repo.environments.keys()).forEach((env) => {
        const statusChecksEnv = repoStatusCheck?.get(env) || [];
        defaultBranchProtections.push({
          pattern: `${env}/*`,
          allowsDeletions: true,
          statusChecks: statusChecksEnv,
        });
      });
    }

    defaultBranchProtections.forEach((branchProtection) => {
      repo.addBranchProtection(
        branchProtection.pattern,
        branchProtection.allowsDeletions,
        this.getTeamsThatCanPush(repo),
        branchProtection.statusChecks,
        this.getTeamsThatCanBypassPullRequestChecks(),
        this.getTeamsThatCanForcePush(),
      );
    });
  }

  public createWebhooks(repo: Repo): void {
    const repoWebhooks = this.repoWebhooks.get(repo.name);

    this.webhooks.forEach((webhook, name) => {
      // Ignore the global webhook if we have a repo version of it
      if (repoWebhooks && repoWebhooks.has(name)) {
        return;
      }

      repo.addWebhook(name, webhook.url, webhook.events);
    });

    if (repoWebhooks) {
      repoWebhooks.forEach((webhook, name) => {
        repo.addWebhook(name, webhook.url, webhook.events);
      });
    }
  }
}
