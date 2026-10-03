---
description: Custom slash commands for repository management and scanning
trigger: always_on
---

# Custom Slash Commands

You are configured to understand and execute the following custom pseudo-slash-commands when the user types them. When you see these, execute the corresponding tools (e.g., `run_command` or exploration tools) immediately to satisfy the user's request.

## Available Commands

- `/scan`: Perform a deep scan of the current project to familiarize yourself with the architecture, tech stack, state management, UI components, and backend endpoints. Read `package.json`, inspect `src/`, analyze state management patterns, and verify security/performance best practices. Output your findings as a structured artifact document (e.g., `project-scan.md`).
- `/add`: Run `git add .` (or specific files if the user mentions them).
- `/commit [message]`: Run `git commit -m "[message]"`. If no message is provided, analyze the staged changes and generate a conventional commit message.
- `/push`: Run `git push origin <current-branch>`. Determine the current branch first if necessary.
- `/pull`: Run `git pull origin <current-branch>`.

### Execution
Always use the `run_command` tool to execute the git commands. Do not just output the command for the user to run. Take action autonomously.
