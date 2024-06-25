import * as aws from "@pulumi/aws";
import {
  DEFAULT_GROUP_NAME,
  DEFAULT_USER_NAME,
  DEFAULT_RESOURCE_PREFIX,
} from "./config";

export function initDefaultAdminUser(tokenHash: string): aws.iam.AccessKey {
  const infraGroup = new aws.iam.Group(DEFAULT_GROUP_NAME, {});

  // Allow read only access to members of this group
  new aws.iam.GroupPolicyAttachment(
    `${DEFAULT_RESOURCE_PREFIX}-group-policy-attachment`,
    {
      group: infraGroup.name,
      policyArn: aws.iam.ManagedPolicies.ReadOnlyAccess,
    },
    {
      deleteBeforeReplace: true,
    },
  );

  // Create a default admin user
  const infraAdminUser = new aws.iam.User(
    `${DEFAULT_RESOURCE_PREFIX}-admin-user`,
    {
      path: `/${DEFAULT_GROUP_NAME}/`,
      tags: { iac: "core" },
    },
  );

  new aws.iam.UserPolicyAttachment(
    `${DEFAULT_RESOURCE_PREFIX}-${DEFAULT_USER_NAME}-user-policy-attachment`,
    {
      user: infraAdminUser.name,
      policyArn: aws.iam.ManagedPolicies.AdministratorAccess, // Allow full access
    },
  );

  // Add this user to the admin group
  new aws.iam.UserGroupMembership(
    `${DEFAULT_RESOURCE_PREFIX}-${DEFAULT_USER_NAME}-usergroup-membership`,
    {
      user: infraAdminUser.name,
      groups: [infraGroup.name],
    },
  );

  // Create a access key with the token hash, changing of token hash will
  // invalidate this key
  return new aws.iam.AccessKey(
    `${DEFAULT_RESOURCE_PREFIX}-${DEFAULT_USER_NAME}-accesskey-${tokenHash}`,
    {
      user: infraAdminUser.name,
    },
  );
}
