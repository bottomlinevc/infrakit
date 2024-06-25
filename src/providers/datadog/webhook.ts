export type Webhook = {
  url: string;
  events: string[];
};

export function getDefaultWebhook(datadogHost: string): Webhook {
  return {
    url: `${datadogHost}/intake/webhook/github?api_key=`,
    events: [
      "push",
      "issues",
      "pull_request",
      "commit_comment",
      "discussion_comment",
      "issue_comment",
      "pull_request_review_comment",
      "repository",
      "repository_vulnerability_alert",
      "member",
      "team_add",
      "public",
    ],
  };
}
