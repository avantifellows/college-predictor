# Pull Request Guidelines

:+1::tada: Thanks for taking the time to contribute! :tada::+1:

In order to give everyone a chance to submit a pull request and contribute to the project, we have put restrictions in place. This section outlines the guidelines that should be imposed upon pull requests in the project.

# Table of Contents

<!-- toc -->

- [Pull Requests and Issues](#pull-requests-and-issues)
- [Linting and Formatting](#linting-and-formatting)
- [Testing](#testing)
- [Pull Request Processing](#pull-request-processing)
  - [Only submit PRs against our `main` branch](#only-submit-prs-against-our-main-branch)

<!-- tocstop -->

## Pull Requests and Issues

1. Do not start working on any open issue and raise a PR unless the issue is assigned to you. PRs that don't meet these guidelines will be closed.
1. Pull requests must be based on [open issues](https://github.com/avantifellows/college-predictor/issues) available.
1. [Use this method to automatically close the issue when the PR is completed.](https://docs.github.com/en/github/managing-your-work-on-github/linking-a-pull-request-to-an-issue)

## Linting and Formatting

All the pull requests must have code that is properly linted and formatted, so that uniformity across the repository can be ensured.

Before opening a PR, you can run the following scripts to automatically lint and format the code properly:

1. Install `pre-commit` if you haven't already:
    ```bash
    pip install pre-commit
    ```

2. Install the pre-commit hooks:
    ```bash
    pre-commit install
    ```

3. Run the pre-commit hooks on all files:
    ```bash
    pre-commit run --all-files
    ```

## Pull Request Processing

These are key guidelines for the procedure:

### Only submit PRs against our `main` branch

1. Only submit PRs against our `main` branch.
1. We do not accept draft Pull Requests. They will be closed if submitted. We focus on work that is ready for immediate review.
1. Removing assigned reviewers from your Pull Request will cause it to be closed. The quality of our code is very important to us. Therefore we make experienced maintainers of our code base review your code. Removing these assigned persons is not in the best interest of this goal.
1. If you have not done so already, please read the `Pull Requests and Issues` section above.
1. We prioritize quality PRs, so please spend time ensuring your submission is as good as it can be.
1. Upon successful push to the fork, check if all tests are passing; if not, fix the issues and then create a pull request.
1. If the pull request's code quality is not up to par, or it would break the app, it will more likely be closed. So please be careful when creating a PR.
1. Ensure the PR title clearly describes the problem it is solving. In the description, include the relevant issue number, snapshots, and videos after changes are added.
1. If you are borrowing a code, please disclose it. It is fine and sometimes even recommended to borrow code, but we need to know about it to assess your work. If we find out that your pull request contains a lot of code copied from elsewhere, we will close the pull request.
1. No Work In Progress. ONLY completed and working pull requests and with respective test units will be accepted. A WIP would fall under rule 4 and be closed immediately.
1. Please do not @mention contributors and mentors. Sometimes it takes time before we can review your pull request or answer your questions, but we'll get to it sooner or later. @mentioning someone just adds to the pile of notifications we get and it won't make us look at your issue faster.
1. Do not force push. If you make changes to your pull request, please simply add a new commit, as that makes it easy for us to review your new changes. If you force push, we'll have to review everything from the beginning.
1. PR should be small, easy to review and should follow standard coding styles.
1. If PR has conflicts because of recently added changes to the same file, resolve issues, test new changes, and submit PR again for review.
1. PRs should be atomic. That is, they should address one item (issue or feature)
1. After submitting PR, if you are not replying within 48 hours, then in that case, we may need to assign the issue to other contributors based on the priority of the issue.
