# Running a Project

MEMO keeps the model in ordinary project files. Run the CLI for repeatable
operations and Architect when you need interactive exploration.

## Start Architect

From a model project:

```bash
memo-architect dev
```

The default address is `http://localhost:3000`. To select a port or avoid
opening a browser:

```bash
memo-architect dev --port 4173 --no-open
```

The server watches project SysML files. After saving a change, confirm that the
model reloads and review any new validation findings.

## Validate without the UI

```bash
memo validate .
```

For automation:

```bash
memo validate . --format junit --output validation.xml
memo validate . --format json --output validation.json
```

## Build a static review

```bash
memo-architect build --output review-site
```

Use a static build for a bounded review snapshot. Keep the source commit,
resolved dependency lock, and build command with the review record.

## Run the bundled example

From a Memo Architect source checkout:

```bash
pnpm run build
pnpm run example:dev
```

The example is the quickest way to learn the workbench before opening your own
project.
