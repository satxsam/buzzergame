# Agent Instructions

## Git workflow

- **Group commits logically** — each commit should represent one coherent change (a bug fix, a feature, a refactor). Don't bundle unrelated changes into a single commit.
- **Use a branch for major changes** — anything that touches multiple files in a significant way, introduces a new feature with several moving parts, or could break existing behavior should be done on a feature branch and merged via PR. Small bug fixes and minor tweaks can go directly to `main`.
