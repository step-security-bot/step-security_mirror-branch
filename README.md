[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# Mirror Branch

Keeps a second branch pointing at whatever commit the workflow ran on.

The usual reason to want this is renaming a branch without breaking everything
that still refers to the old name. Point the workflow at the new branch, mirror
it onto the old one, and jobs, deploy hooks, and clones pinned to the old name
keep working while you track down what still needs updating.

This is a StepSecurity maintained action: a secure drop-in replacement for
`zofrex/mirror-branch`, with the same inputs and the same behaviour.

## Usage

Mirror `main` onto `master`:

```yaml
name: Mirror branch

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: step-security/mirror-branch@v1
```

Mirror `release` onto `deployment`, refusing to discard commits:

```yaml
on:
  push:
    branches: [release]

permissions:
  contents: write

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: step-security/mirror-branch@v1
        with:
          target-branch: deployment
          force: false
```

No checkout step is needed. The branch is moved through the GitHub API, so
there is no clone and no working tree.

## Inputs

| Name            | Default             | Description                                    |
| --------------- | ------------------- | ---------------------------------------------- |
| `target-branch` | `master`            | Name of the branch to move                     |
| `token`         | `${{ github.token }}` | Token used to authenticate against the API   |
| `force`         | `true`              | Whether commits on the target may be discarded |

There are no outputs.

## Permissions

The job needs `contents: write`. The default `GITHUB_TOKEN` is enough as long
as the workflow grants it:

```yaml
permissions:
  contents: write
```

A branch protected against force pushes will reject the update no matter what
the token is. To mirror onto a protected branch you need a token whose identity
is allowed to bypass that rule, which means a PAT or a GitHub App token rather
than `GITHUB_TOKEN`.

## The source branch is the branch you trigger on

There is no input for the source. The commit mirrored is always the one the run
was triggered on, so the trigger is what selects it. Restrict the workflow to a
single branch:

```yaml
on:
  push:
    branches: [main]
```

Trigger on several and each push races to overwrite the same target, leaving it
on whichever run finished last.

## About `force`

It defaults to `true`, which is worth knowing before you point this at a branch
people work on. Force means the API is allowed to move the target branch to a
commit that is not a descendant of where it currently is, discarding anything
only that branch had.

That default makes sense for the intended use, where the target is an alias for
the source and has no commits of its own. If the target is a branch anyone
commits to directly, set `force: false`; the update then fails instead of
discarding their work.

Only the exact word `true`, in any casing, enables it. Any other value,
including `yes` and `1`, leaves it off.

## Licence

MIT. See [LICENSE](LICENSE).
