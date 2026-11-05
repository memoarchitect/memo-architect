# Release notes

Versioned under [semantic versioning](https://semver.org/). Before 1.0 a change that breaks a model, a command or a setting raises the minor number; a fix or addition that breaks nothing raises the patch. Every release is tagged in the repository. The notes for all three packages are also on [memoarchitect.com/releases.html](https://memoarchitect.com/releases.html).

## 0.17.x

### Changed

- **Block diagrams have one toolbar**, placed at the side or the top. The
  general view's strip has a level dropdown and a single Expand / Collapse all
  toggle; Graph mode is gone from block diagrams.
- **Architect warns when a block diagram mixes element kinds**, which usually
  means a view selects too much.
- **The Model Explorer** puts the element-type folder above the package folder,
  shows display names, and groups use cases by declared level. The Use Cases page
  groups the same way.
- **Variants show as rows on one flow**, with chips to switch between them and
  preview each.
- **IBD editing** frames the resize handles of a selected part, keeps saved
  routes, and ties connector ends to their ports.

## 0.16.x

### Added

- **Traceability Matrix rebuilt.** Pick rows and columns (an ontology type, a
  saved query, or a quick trace such as *Requirement → Test case*), build, and
  save the matrix into its package as a view. Table and list displays, a gap
  filter, a panel of saved matrices, and link editing (**Edit trace**).
- **Interfaces page.** Pick two parts and see every interface between them;
  save the result as a markdown page. `memo-architect interfaces <a> <b>` does the
  same from a terminal.
- **IBD editing.** Parts and ports move without overlapping, connectors are
  routed at right angles and rerouted as parts move, per-connector routing type,
  auto-route, part and port spacing, and Undo for every automatic change. The
  layout is saved in the view's own source.
- **Jupyter starts for you.** Opening Analysis Notebooks starts JupyterLab for
  the project and stops it when Architect exits; `memo-architect jupyter` runs it
  alone.
- **Documents draw their diagrams.** The Word, HTML and PDF downloads, and
  `memo-architect export dhf`, include the document's views.
- **UI Screens** detect, label and accept screen regions, with a traceability
  popup per region.
- **Settings › Methodology** shows and chooses the extensions and layers a model
  uses; **Settings › Features** switches experimental features on per person.
- `memo-architect --list` lists the bundled examples.

### Changed

- **Navigation regrouped** into Home, Views, Model, Advanced and Settings, opened
  from ☰. Every page, element and matrix has its own URL.
- **Rules are grouped by layer**, with a switch for each group and rule. Rules and
  Methodology open from Settings › Model.
- **The Properties panel** shows only when something is selected.
- **A context view's `subjectElement`** is its system of interest; context
  spokes keep the bends you give them.
- **Views can select declared relationship types** (`verifiedBy`,
  `derivesFrom`, `realizes`).
- **Architect hands out no ids of its own**: it shows the `displayId` and id
  family the compiled model gives each element.
- The Guide and Custom Dashboards are experimental and off unless switched on.

### Removed

- The compliance wizard.

## 0.15.0 (experimental release)

This release adds support for the OpenSysML compiler alongside SysIDE. The OpenSysML path is new and has had less use. The next version will be more stable.

### Breaking

- **`memo-architect templates` is removed.** In Architect "template" means a DHF document template; project starters are gone (see the tools notes), so start a project with `init` or `init --example <id>`.
- **Project commands live in `memo-architect`.** `init` and the other project commands that were under `memo` are now `memo-architect` commands. A retired `memo` command exits with an error naming its replacement.

### Added

- **Choose the compiler in Architect.** The Compiler control sets the project's compiler and, separately, your own ("just for me"). `memo-architect config set|get|unset` does the same from a terminal.
- **Rule editor: obligation and the typed trace.** The Rules view shows each rule's obligation (required, recommended or best practice) and each `EnforcesClause` trace, filters by obligation, and no longer calls a rule with no clause a gap. The new-rule form takes an obligation (the severity follows it unless you choose one) and shows each chosen clause as the typed trace it writes.
