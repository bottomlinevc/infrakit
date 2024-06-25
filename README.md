# Bottomline: Infrakit

The Infrakit is a collection of reusable components that can be used to build
infrastructure as code (IaC) projects without additional boilerplate code.

## Pulumi vs Terraform

We use Pulumi as our platform of choice. Pulumi was chosen over Terraform because:

- It allows writing of IaC code in languages we are familiar with
- The IaC code can have tests
- The Terraform CLI + Workspace integration has massive tech debt which became
  apparent on regular use
- Multi project setups are a nightmare to manage in Terraform
- Terraform required storing of credentials in the Terraform Cloud platform

## Monolithic vs Micro-Stacks

Rather than follow a monolithic approach, we will adopt the micro-stacks project
structure. This allows us to scope code and access credentials, allow for faster
and independent updates, monitor costs on team level and scale without breaking things.

### References

- [https://www.pulumi.com/docs/using-pulumi/organizing-projects-stacks/](Organizing Pulumi projects & stacks)
- [https://blog.bitsrc.io/managing-micro-stacks-using-pulumi-87053eeb8678](How to Manage Micro-Stacks with Pulumi)
- [https://www.pulumi.com/blog/iac-recommended-practices-structuring-pulumi-projects/](Iac Recommended Practices: Structuring Pulumi Projects)

## Infrakit Setup

### Generate Slack Incoming Webhook Token

- Create a [Slack App](https://api.slack.com/apps) for your workspace
- Alternatively use an existing app you have already created and installed.
- Name the App `Infrastructure CI`
- Add the incoming-webhook bot scope under OAuth & Permissions.
- Install the app to your workspace (you will select a channel to notify).
- Activate and create a new webhook under Incoming Webhooks for `#bottomline-infra-ci`
- Copy the Webhook URL from the Webhook you just generated, we will use it below.

### Configure environment variables

We now need to add Github Repository Variables and Secrets:

- `INFRA_SLACK_WEBHOOK_URL`: `(SECRET)` The Slack Incoming Webhook URL you generated above
- `SLACK_PREFIX`: `(VARIABLE)` With the value `bottomline`

### Initialize the Github Repository

- We now need to commit out code to the remote repository on Github.

```sh
cd infrakit
git init
git commit -am "Initial Commit"
git branch -M main
git remote add origin git@github.com:bottomlinevc/infrakit.git
git push -u origin main
```
