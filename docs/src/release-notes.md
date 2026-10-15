# Release notes

Versioned under [semantic versioning](https://semver.org/). Before 1.0 a change that breaks a model, a command or a setting raises the minor number; a fix or addition that breaks nothing raises the patch. Every release is tagged in the repository. The notes for all three packages are also on [memoarchitect.com/releases.html](https://memoarchitect.com/releases.html).

## 0.15.0 (experimental release)

This release adds support for the OpenSysML compiler alongside SysIDE. The OpenSysML path is new and has had less use. The next version will be more stable.

### Breaking

- **`memo-architect templates` is removed.** In Architect "template" means a DHF document template; project starters are gone (see the tools notes), so start a project with `init` or `init --example <id>`.
- **Project commands live in `memo-architect`.** `init` and the other project commands that were under `memo` are now `memo-architect` commands. A retired `memo` command exits with an error naming its replacement.

### Added

- **Choose the compiler in Architect.** The Compiler control sets the project's compiler and, separately, your own ("just for me"). `memo-architect config set|get|unset` does the same from a terminal.
- **Rule editor: obligation and the typed trace.** The Rules view shows each rule's obligation (required, recommended or best practice) and each `EnforcesClause` trace, filters by obligation, and no longer calls a rule with no clause a gap. The new-rule form takes an obligation (the severity follows it unless you choose one) and shows each chosen clause as the typed trace it writes.
