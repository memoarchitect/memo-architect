# MEMO Base Helpers

`ontology/base/` is the active source path for L0 helper SysML packages.
New helper definitions for Epic B belong here under the `memo::base::*`
namespace.

This folder contains shared library definitions only: dimensions, methodology
scope types, aliases, rules, views, relationships, and the
`memo::base::stdlib::*` standard-library import wrapper. It must not contain
medical-device domain kinds, architecture sublayer kinds, compliance standard
kinds, artifact document kinds, or project examples.

The existing `ontology/core/` folder is legacy input from the pre-ADR-1-12
layout. It remains in place until migration stories move or replace its useful
definitions under `ontology/base/`; future L0 helper edits should target
`ontology/base/` rather than adding new files to `ontology/core/`.
