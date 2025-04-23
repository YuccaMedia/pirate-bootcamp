# Project TODO & Public Release Checklist

This file tracks tasks, improvements, and steps needed before considering a public release.

## Public Release Checklist

-   [ ] **Configure GitHub Branch Protection Rulesets:**
    -   Enable ruleset enforcement (requires GitHub Team/Enterprise plan if repo stays private, or make repo public).
    -   Target the `main` branch.
    -   Require Pull Requests before merging.
    -   Require status checks to pass (e.g., CI tests, SonarCloud analysis).
    -   Require linear history (optional but good practice).
    -   Restrict force pushes and deletions.
    -   Consider requiring signed commits.
    -   Review bypass list (if needed).

-   [ ] **Review Sensitive Information:**
    -   Ensure no sensitive keys, passwords, or data are hardcoded or committed (check history too).
    -   Double-check `.gitignore` is comprehensive.
    -   Verify example environment files (`.env.example`) don't contain real credentials.

-   [ ] **Finalize Documentation:**
    -   Update `README.md` with final project description, setup, usage, and contribution guidelines (if applicable).
    -   Ensure comments in code are clear and up-to-date.
    -   Add `LICENSE` file if not present (e.g., MIT).

-   [ ] **Security Audit:**
    -   Perform a final security review/scan (e.g., Snyk, SonarCloud).
    -   Address any high/critical vulnerabilities.

-   [ ] **Deployment Strategy:**
    -   Define and document the deployment process (e.g., Devnet, Mainnet).
    -   Ensure deployment scripts are working.

-   [ ] **Dependency Review:**
    -   Check for outdated or vulnerable dependencies (`npm audit`).

## General TODOs

-   [ ] (Add other development tasks or feature ideas here)
