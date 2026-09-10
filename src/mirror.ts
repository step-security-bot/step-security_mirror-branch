/**
 * The single API call this action makes.
 *
 * Kept as a structural type rather than importing Octokit's own, so the unit
 * tests can supply a double without standing up a client.
 */
export interface RefUpdater {
  rest: {
    git: {
      updateRef(params: {
        owner: string;
        repo: string;
        ref: string;
        sha: string;
        force: boolean;
      }): Promise<unknown>;
    };
  };
}

export interface MirrorRequest {
  owner: string;
  repo: string;
  /** Branch to move, without any `refs/` prefix. */
  branch: string;
  /** Commit the branch should end up pointing at. */
  sha: string;
  force: boolean;
}

/**
 * Builds the ref path the git refs API expects.
 *
 * The endpoint wants `heads/<branch>` rather than the fully qualified
 * `refs/heads/<branch>`, and it accepts the branch name verbatim, so a branch
 * containing slashes works without any escaping.
 */
export function refFor(branch: string): string {
  return `heads/${branch}`;
}

/**
 * Points the target branch at the given commit.
 *
 * This moves a ref through the API rather than pushing, so no clone or working
 * tree is involved and the source branch is never checked out.
 *
 * With `force` disabled the API rejects any update that would drop commits,
 * and that rejection surfaces as a thrown error rather than a silent no-op.
 */
export async function mirrorBranch(
  client: RefUpdater,
  request: MirrorRequest,
): Promise<void> {
  const { owner, repo, branch, sha, force } = request;

  await client.rest.git.updateRef({
    owner,
    repo,
    ref: refFor(branch),
    sha,
    force,
  });
}
