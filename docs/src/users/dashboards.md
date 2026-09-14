# Custom Dashboards

A dashboard is a markdown page with **live diagrams** in it. Write the context in
prose, reference any diagram in the model, and the diagram renders as the real
canvas — not a picture — and updates whenever the model or its layout changes.
Embedded diagrams are read-only: editing happens on the diagram's own page
through **Open diagram**. Viewing is not restricted — drag to pan, pinch or
⌘/Ctrl-scroll to zoom, and the corner controls zoom in, zoom out, fit the whole
diagram, and go full screen.

Open **Tools → Custom Dashboards**, or go to `/dashboards`.

## Shared or only me

Every dashboard is one markdown file, in one of two places:

| Scope | File | In git? |
| --- | --- | --- |
| Shared | `dashboards/<id>.md` | committed with the project |
| Only me | `dashboards/user/<id>.md` | ignored — `dashboards/user/` is in `.gitignore` |

The id is the file name. A dashboard exists because its file exists, so adding
one by hand, or receiving one in a `git pull`, is enough — open pages update
without a reload.

The first time you save an only-me dashboard, Architect adds
`dashboards/user/` to the project's `.gitignore` (one appended line; an existing
rule for it is left alone). It also writes `dashboards/README.md`, which explains
the two folders to anyone browsing the repository. Edit that README freely — it
is only written when missing, and it is never listed as a dashboard.

**Share** moves an only-me dashboard up into `dashboards/`; **Unshare** moves it
back. When the same id exists in both folders, your own copy wins and the list
marks the shared one as hidden.

Dashboards live outside `model/` and outside viewpoint packages on purpose:
views are part of the SysML model, while a dashboard is prose that *cites*
views by id. A dashboard can therefore draw on any number of viewpoints, and
never affects what the model means.

## The home dashboard

The landing page is the dashboard with id `home`. Until someone customizes it,
MEMO Architect shows its built-in page. **Customize** copies that page into a
file you can edit — only-me by default, or shared for the whole team.
**Reset to built-in** deletes the file.

## Viewpoint dashboards

Every viewpoint has a dashboard, listed first under the viewpoint in the
**Viewpoints** tree and on the **Dashboards** page. Until someone writes one,
Architect generates it from the model:

- the viewpoint's description;
- a **Stakeholders and concerns** table — filled from the viewpoint's
  `stakeholders` and `framedConcerns` when the model declares them, otherwise a
  placeholder row;
- every view that conforms to the viewpoint, embedded live, each followed by a
  **Commentary** placeholder;
- **Open questions** and **Decisions and rationale** sections to fill in.

The generated page follows the model: a new view appears on it by itself.
**Customize** writes it to `dashboards/viewpoint-<viewpoint id>.md` — shared by
default, because commentary on a viewpoint is the team's — and from then on the
file is what shows. **Reset to generated** deletes the file.

The `sysml-diagram-samples` example ships a filled-in one for its Internal Block
Diagram viewpoint.

## Writing a dashboard

Click **Edit** for the markdown beside a live preview. Save with the button or
<kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>S</kbd>.

A diagram embed is a directive **on its own line**. **Insert diagram** writes it
for you:

```text
{{diagram:beverageMachineIBD}}
{{diagram:beverageMachineIBD height=640}}
```

The reference may be the diagram's id, short id or name. `height` is in pixels
(default 480).

The home page's sections are widgets you can place anywhere:

| Directive | Shows |
| --- | --- |
| `{{widget:header}}` | project name and date |
| `{{widget:stats}}` | element, relationship, completeness and violation counts |
| `{{widget:coverage}}` | layer coverage tiles |
| `{{widget:next-action}}` | suggested next step |
| `{{widget:next-steps}}` | suggested next step beside quick-action buttons |
| `{{widget:viewpoint-dashboards}}` | a link to every viewpoint's dashboard |
| `{{widget:diagrams}}` | number of model views |

Prose can carry live values too — `{{model.name}}`, `{{model.elements}}`,
`{{model.relationships}}`, `{{model.views}}` and `{{model.viewpoints}}` — and a
link to an Architect page, such as `[Traceability](/traceability)`, opens it in
place. Links to `javascript:` or `data:` URLs are shown as plain text.

Dashboards use the same markdown dialect as [DHF documents](dhf-workbench.md):
`{{ref:ID.attr}}` and `memo-query` blocks work here too, and a diagram embedded
in a DHF document renders live in its preview.
