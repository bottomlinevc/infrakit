import * as datadog from "@pulumi/datadog";
import { DEFAULT_RESOURCE_PREFIX } from "./config";

// DigitalOcean API Key provisioning for repository <> Datadog integration
export function initDatadogKey(tokenHash: string): datadog.ApiKey {
  return new datadog.ApiKey(`${DEFAULT_RESOURCE_PREFIX}-${tokenHash}`, {
    name: `${DEFAULT_RESOURCE_PREFIX}-datadog`,
  });
}
