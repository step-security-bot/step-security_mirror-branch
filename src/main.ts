import * as core from "@actions/core";
import * as github from "@actions/github";
import { readInputs } from "./inputs.js";
import { mirrorBranch } from "./mirror.js";
import { validateSubscription } from "./subscription.js";

/**
 * Mirrors the commit this run was triggered on onto the target branch.
 *
 * The source is always the run's own commit, taken from the event context.
 * There is no input for it, so a workflow using this action has to restrict
 * itself to the branch it means to mirror; triggering on several branches
 * would have each of them race to overwrite the same target.
 */
export async function run(): Promise<void> {
  try {
    await validateSubscription();

    const { targetBranch, token, force } = readInputs();
    const { owner, repo } = github.context.repo;
    const sha = github.context.sha;

    core.info(
      `Mirroring ${sha} onto ${owner}/${repo}@${targetBranch}` +
        (force ? " (force)" : ""),
    );

    await mirrorBranch(github.getOctokit(token), {
      owner,
      repo,
      branch: targetBranch,
      sha,
      force,
    });

    core.info(`${targetBranch} now points at ${sha}`);
  } catch (error) {
    // The wording is kept from the action this replaces, because workflows and
    // log scrapers may well be matching on it.
    core.setFailed(`Failed to update ref: ${error}`);
  }
}
