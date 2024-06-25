import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { getShortHash } from "../utils";

export class RepoEnvironment {
  name: string;
  repoName: string;

  environment?: github.RepositoryEnvironment;
  deploymentPolicies: Map<string, github.RepositoryEnvironmentDeploymentPolicy>;
  variables: Map<string, github.ActionsEnvironmentVariable>;
  secrets: Map<string, github.ActionsEnvironmentSecret>;

  constructor(repoName: string, name: string) {
    this.repoName = repoName;
    this.name = name;

    this.deploymentPolicies = new Map<
      string,
      github.RepositoryEnvironmentDeploymentPolicy
    >();
    this.variables = new Map<string, github.ActionsEnvironmentVariable>();
    this.secrets = new Map<string, github.ActionsEnvironmentSecret>();
  }

  getDependencies(): pulumi.Resource[] {
    const dependencies = [];
    if (this.environment) {
      dependencies.push(this.environment);
    }

    return dependencies;
  }

  addDeploymentPolicy(
    branchPattern: string,
  ): github.RepositoryEnvironmentDeploymentPolicy {
    const patternHash = getShortHash(`${branchPattern}`);

    const policy = new github.RepositoryEnvironmentDeploymentPolicy(
      `${this.repoName}-env-${this.name}-deploymentPolicy-${patternHash}`,
      {
        repository: this.repoName,
        environment: this.name,
        branchPattern: branchPattern,
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );

    this.deploymentPolicies.set(branchPattern, policy);

    return policy;
  }

  addVariable(
    name: string,
    value: pulumi.Output<string> | string,
  ): github.ActionsEnvironmentVariable {
    const variable = new github.ActionsEnvironmentVariable(
      `${this.repoName}-env-${this.name}-${name}`,
      {
        repository: this.repoName,
        environment: this.name,
        variableName: name,
        value: value,
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );

    this.variables.set(name, variable);

    return variable;
  }

  addVariables(
    variables: Map<string, pulumi.Output<string> | string>,
  ): github.ActionsEnvironmentVariable[] {
    return Array.from(variables).map(([name, value]) => {
      return this.addVariable(name, value);
    });
  }

  addSecret(
    name: string,
    value: pulumi.Output<string> | string,
  ): github.ActionsEnvironmentSecret {
    const secret = new github.ActionsEnvironmentSecret(
      `${this.repoName}-env-${this.name}-${name}`,
      {
        repository: this.repoName,
        environment: this.name,
        secretName: name,
        plaintextValue: value,
      },
      {
        deleteBeforeReplace: true,
        dependsOn: this.getDependencies(),
      },
    );

    this.secrets.set(name, secret);

    return secret;
  }

  addSecrets(
    secrets: Map<string, pulumi.Output<string> | string>,
  ): github.ActionsEnvironmentSecret[] {
    return Array.from(secrets).map(([name, value]) => {
      return this.addSecret(name, value);
    });
  }
}
