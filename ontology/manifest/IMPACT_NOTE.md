# Impact Note

## Release 1.0.0
This release establishes the baseline integrated structure for the package.

### Expected impact
- New adopters: use this release as the baseline.
- Existing draft users: update imports and references to the dedicated `viewpoints/` and `views/` libraries where appropriate.
- Product models without cybersecurity usage: no conceptual migration required.
- Product models with cybersecurity usage: align to the first-class `memo_cybersecurity.sysml` layer and cyber document views.

### Breaking-change assessment
- External release status: baseline release, so no prior public version is assumed.
- Internal draft changes: moderate structural change from earlier working bundles because views/viewpoints and cybersecurity were promoted and reorganized.

### Future change guidance
Future releases should continue using a single package version until there is a strong need for independently versioned sublibraries.
