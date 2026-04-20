# Code-Derived Function Catalog

This catalog is generated from the TypeScript AST for production source files in `packages/core`, `packages/cli`, `packages/web`, `packages/ontology-core`, `packages/ontology-medical`, and `packages/medical-modeling-profile`.

- Generated at: 2026-04-17T17:47:00.140Z
- Total function-like symbols: 968
- Total modules: 158

## packages/cli/src/commands/ask.ts

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 21 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 41 | `askCommand` | function_declaration | yes | yes | `question, options` |

## packages/cli/src/commands/build.ts

- Symbols: 8
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 22 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 39 | `buildCommand` | function_declaration | yes | yes | `options` |
| 151 | `resolveWebDist` | function_declaration | no | no | `cwd` |
| 182 | `buildKpar` | function_declaration | no | yes | `cwd, distDir, projectName` |
| 251 | `collectDirFiles` | function_declaration | no | no | `dir, baseDir` |
| 270 | `createTar` | function_declaration | no | no | `files` |
| 314 | `writeOctal` | function_declaration | no | no | `buf, offset, length, value` |
| 319 | `inlineAssets` | function_declaration | no | no | `html, baseDir` |

## packages/cli/src/commands/create-package.ts

- Symbols: 8
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 42 | `createPackageCommand` | function_declaration | yes | yes | `name, options` |
| 152 | `scaffoldOntology` | function_declaration | no | no | `dir, name` |
| 218 | `scaffoldProfile` | function_declaration | no | no | `dir, name, extendsPackage` |
| 260 | `scaffoldLibrary` | function_declaration | no | no | `dir, name` |
| 275 | `scaffoldDevice` | function_declaration | no | no | `dir, name` |
| 287 | `buildPackageYaml` | function_declaration | no | no | `name, type, description, license, extendsPackage` |
| 306 | `buildProjectJson` | function_declaration | no | no | `name, type` |
| 318 | `buildNpmPackageJson` | function_declaration | no | no | `name, description, license, author, extendsPackage` |

## packages/cli/src/commands/dev.ts

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 24 | `getGitInfo` | function_declaration | no | no | `cwd` |
| 25 | `git` | arrow_function | no | no | `cmd` |
| 36 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 53 | `devCommand` | function_declaration | yes | yes | `options` |
| 100 | `rebuild` | function_declaration | no | yes | `` |
| 245 | `resolveWebPackage` | function_declaration | no | no | `cwd` |

## packages/cli/src/commands/dhf-draft.ts

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 24 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 46 | `dhfDraftCommand` | function_declaration | yes | yes | `options` |

## packages/cli/src/commands/dhf-init.ts

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 27 | `selectTemplates` | function_declaration | no | no | `profile` |
| 110 | `scaffoldDhfDirectory` | function_declaration | no | no | `projectDir, profile, templateGroups` |
| 144 | `generateDhfConfig` | function_declaration | no | no | `projectDir, companyName, productName, profile, templateGroups` |
| 203 | `groupTitle` | function_declaration | no | no | `group` |
| 209 | `buildStandardsList` | function_declaration | no | no | `profile` |
| 231 | `dhfInitCommand` | function_declaration | yes | yes | `options` |

## packages/cli/src/commands/dhf-preview.ts

- Symbols: 7
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 27 | `markdownToHtml` | function_declaration | no | no | `md` |
| 67 | `wrapHtml` | function_declaration | no | no | `title, body` |
| 134 | `findDhfFiles` | function_declaration | no | no | `dhfDir` |
| 137 | `scan` | function_declaration | no | no | `dir` |
| 157 | `dhfPreviewCommand` | function_declaration | yes | yes | `options` |
| 174 | `refreshModel` | function_declaration | no | yes | `` |
| 184 | `findSysml` | function_declaration | no | no | `dir` |

## packages/cli/src/commands/dhf.ts

- Symbols: 9
- Exported symbols: 6

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 28 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 54 | `loadModel` | function_declaration | no | yes | `` |
| 82 | `resolveTargets` | function_declaration | no | no | `target, group, dhfConfig` |
| 104 | `exportDhfCommand` | function_declaration | yes | yes | `options` |
| 190 | `dhfStatusCommand` | function_declaration | yes | yes | `options` |
| 241 | `dhfSnapshotCommand` | function_declaration | yes | yes | `options` |
| 264 | `dhfDiffCommand` | function_declaration | yes | yes | `options` |
| 311 | `dhfRedlineCommand` | function_declaration | yes | yes | `options` |
| 353 | `dhfReviewPacketCommand` | function_declaration | yes | yes | `options` |

## packages/cli/src/commands/export.ts

- Symbols: 4
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 17 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 34 | `buildFullModel` | function_declaration | no | no | `cwd, config` |
| 57 | `exportJsonCommand` | function_declaration | yes | yes | `options` |
| 101 | `exportDotCommand` | function_declaration | yes | yes | `options` |

## packages/cli/src/commands/generate.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 25 | `generateCommand` | function_declaration | yes | yes | `description, options` |

## packages/cli/src/commands/import-ea.ts

- Symbols: 2
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 34 | `importEaCommand` | function_declaration | yes | yes | `file, options` |
| 116 | `importCameoCommand` | function_declaration | yes | yes | `file, options` |

## packages/cli/src/commands/import-owl.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 30 | `importOwlCommand` | function_declaration | yes | yes | `file, options` |

## packages/cli/src/commands/import-sysand.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 24 | `importSysandCommand` | function_declaration | yes | yes | `projectDir, options` |

## packages/cli/src/commands/import.ts

- Symbols: 5
- Exported symbols: 4

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 30 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 50 | `importCsvCommand` | function_declaration | yes | yes | `csvFile, options` |
| 113 | `importRelCsvCommand` | function_declaration | yes | yes | `csvFile, options` |
| 181 | `importTemplateCommand` | function_declaration | yes | yes | `templateType, options` |
| 220 | `importDiffCommand` | function_declaration | yes | yes | `csvFile, options` |

## packages/cli/src/commands/init.ts

- Symbols: 12
- Exported symbols: 7

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 106 | `runWizard` | function_declaration | yes | yes | `` |
| 166 | `resolveArchetypeTemplate` | function_declaration | yes | no | `archetype, fromDir` |
| 191 | `regulatoryComment` | function_declaration | no | no | `regulatoryClass, archetype` |
| 220 | `discoverOntologies` | function_declaration | yes | no | `fromDir` |
| 249 | `scanOntologyDir` | function_declaration | no | no | `dir, results` |
| 287 | `listOntologiesCommand` | function_declaration | yes | no | `` |
| 321 | `loadProfile` | function_declaration | yes | no | `profileName, fromDir` |
| 347 | `listProfiles` | function_declaration | yes | no | `fromDir` |
| 378 | `initCommand` | function_declaration | yes | yes | `name, options` |
| 604 | `extractElementSummary` | function_declaration | no | no | `content` |
| 635 | `resolveImportPackage` | function_declaration | no | no | `ontology, available` |
| 658 | `toIdentifier` | function_declaration | no | no | `name` |

## packages/cli/src/commands/install.ts

- Symbols: 8
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 27 | `detectInstallMode` | function_declaration | yes | no | `source` |
| 54 | `readPackageName` | function_declaration | no | no | `dir` |
| 67 | `readPackageVersion` | function_declaration | no | no | `dir` |
| 80 | `addDependency` | function_declaration | no | no | `configPath, packageName, version` |
| 98 | `installCommand` | function_declaration | yes | yes | `source, options` |
| 157 | `installFromGit` | function_declaration | no | yes | `source, projectDir` |
| 191 | `installFromLocal` | function_declaration | no | yes | `source, projectDir` |
| 234 | `installFromNpm` | function_declaration | no | yes | `source, projectDir` |

## packages/cli/src/commands/lock.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 10 | `lockCommand` | function_declaration | yes | yes | `` |

## packages/cli/src/commands/ontology.ts

- Symbols: 15
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 19 | `ontologyShowCommand` | function_declaration | yes | yes | `` |
| 124 | `ontologyExportOwlCommand` | function_declaration | yes | yes | `options` |
| 163 | `ontologyExportSysandCommand` | function_declaration | yes | yes | `options` |
| 242 | `exportConfigPackage` | function_declaration | no | no | `entry, packagesDir` |
| 294 | `renderReadme` | function_declaration | no | no | `currentConfig, packages` |
| 315 | `renderProjectJson` | function_declaration | no | no | `currentConfig, packages` |
| 340 | `renderMetaJson` | function_declaration | no | no | `packages, outputDir` |
| 373 | `renderSysandLock` | function_declaration | no | no | `currentConfig, packages` |
| 400 | `buildTree` | function_declaration | no | no | `dir, rootDir` |
| 431 | `collectSysmlSources` | function_declaration | no | no | `dir, rootDir` |
| 456 | `parseDeclaredPackages` | function_declaration | no | no | `filePath` |
| 463 | `renderTreeMarkdown` | function_declaration | no | no | `tree` |
| 471 | `renderTreeLines` | function_declaration | no | no | `children, prefix, lines` |
| 482 | `sanitizeName` | function_declaration | no | no | `value` |
| 491 | `tomlString` | function_declaration | no | no | `value` |

## packages/cli/src/commands/plugin.ts

- Symbols: 4
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 20 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 37 | `pluginListCommand` | function_declaration | yes | yes | `` |
| 86 | `pluginCreateCommand` | function_declaration | yes | yes | `name, options` |
| 128 | `pluginRunCommand` | function_declaration | yes | yes | `pluginId, options` |

## packages/cli/src/commands/validate.ts

- Symbols: 5
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 20 | `findSysmlFiles` | function_declaration | no | no | `dir` |
| 39 | `validateCommand` | function_declaration | yes | yes | `projectDir, options` |
| 223 | `generateJUnit` | function_declaration | no | no | `result, completeness, projectName` |
| 228 | `escXml` | arrow_function | no | no | `s` |
| 279 | `makeBar` | function_declaration | no | no | `pct, width` |

## packages/cli/src/lock.ts

- Symbols: 8
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 48 | `checksumFile` | function_declaration | no | no | `filePath` |
| 56 | `serializeLock` | function_declaration | no | no | `lock` |
| 75 | `parseLock` | function_declaration | no | no | `content` |
| 76 | `getString` | arrow_function | no | no | `key` |
| 105 | `createLockFile` | function_declaration | yes | no | `configPath` |
| 139 | `findOntologyRoot` | function_declaration | no | no | `chain` |
| 155 | `checkLockFile` | function_declaration | yes | no | `configPath` |
| 243 | `readLockFile` | function_declaration | yes | no | `projectDir` |

## packages/cli/src/server/config-resolver.ts

- Symbols: 9
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 29 | `loadAndResolveConfig` | function_declaration | yes | no | `configPath` |
| 41 | `loadConfigChain` | function_declaration | yes | no | `configPath` |
| 49 | `resolveParentConfig` | function_declaration | no | no | `packageName, fromDir` |
| 54 | `loadConfigChainInternal` | function_declaration | no | no | `configPath, seen` |
| 72 | `resolveParentConfigPath` | function_declaration | no | no | `packageName, fromDir` |
| 98 | `resolveFromNodeModules` | function_declaration | no | no | `packageName, fromDir` |
| 113 | `resolveFromSubtreeWorkspace` | function_declaration | no | no | `packageName, fromDir` |
| 131 | `resolveFromWorkspace` | function_declaration | no | no | `packageName, fromDir` |
| 149 | `resolveFromMemoPackages` | function_declaration | no | no | `packageName, fromDir` |

## packages/cli/src/server/dev-server.ts

- Symbols: 15
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 28 | `layoutsDir` | function_declaration | no | no | `projectRoot` |
| 32 | `layoutPath` | function_declaration | no | no | `projectRoot, diagramId` |
| 36 | `loadDiagramLayout` | function_declaration | no | no | `projectRoot, diagramId` |
| 45 | `saveDiagramLayout` | function_declaration | no | no | `projectRoot, diagramId, layout` |
| 52 | `loadAllLayouts` | function_declaration | no | no | `projectRoot` |
| 69 | `userDiagramsPath` | function_declaration | no | no | `projectRoot` |
| 73 | `loadUserDiagrams` | function_declaration | no | no | `projectRoot` |
| 79 | `saveUserDiagrams` | function_declaration | no | no | `projectRoot, diagrams` |
| 85 | `createDevServer` | function_declaration | yes | yes | `options` |
| 106 | `serveHelp` | function_declaration | no | no | `req, res` |
| 191 | `broadcastDiagramChange` | function_declaration | no | no | `changedDiagram, op` |
| 211 | `blockToMarkdown` | function_declaration | no | no | `block` |
| 228 | `extractElementIdsFromText` | function_declaration | no | no | `text, elements` |
| 750 | `broadcast` | object_method | no | no | `messages` |
| 763 | `close` | object_method | no | no | `` |

## packages/cli/src/server/file-watcher.ts

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 13 | `createFileWatcher` | function_declaration | yes | no | `projectDir, onChange, debounceMs` |
| 51 | `close` | object_method | no | no | `` |

## packages/cli/src/server/persistor.ts

- Symbols: 3
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 11 | `saveElementToFile` | function_declaration | yes | no | `cwd, element` |
| 53 | `log` | arrow_function | no | no | `msg` |
| 84 | `saveRelationshipToFile` | function_declaration | yes | no | `cwd, rel` |

## packages/core/src/analysis/dsm.ts

- Symbols: 5
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 50 | `computeDSM` | function_declaration | yes | no | `model, options` |
| 131 | `clusterDSM` | function_declaration | no | no | `elementIds, matrix` |
| 139 | `find` | function_declaration | no | no | `x` |
| 144 | `union` | function_declaration | no | no | `a, b` |
| 183 | `reorderDSM` | function_declaration | yes | no | `dsm` |

## packages/core/src/analysis/impact.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 45 | `computeImpact` | function_declaration | yes | no | `model, elementId, direction, maxDepth` |

## packages/core/src/completeness/tracker.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 17 | `computeCompleteness` | function_declaration | yes | no | `model, validation, config` |

## packages/core/src/dhf/dhf-config-v2.ts

- Symbols: 4
- Exported symbols: 4

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 109 | `loadDhfConfigV2` | function_declaration | yes | no | `projectDir` |
| 131 | `isDhfConfigV2` | function_declaration | yes | no | `cfg` |
| 138 | `extractProjectMeta` | function_declaration | yes | no | `cfg` |
| 153 | `resolveManifestDocuments` | function_declaration | yes | no | `cfg, groupFilter` |

## packages/core/src/dhf/dhf-config.ts

- Symbols: 3
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 48 | `loadDhfConfig` | function_declaration | yes | no | `projectDir` |
| 70 | `isDocumentEnabled` | function_declaration | yes | no | `docId, dhfConfig` |
| 78 | `getCustomSections` | function_declaration | yes | no | `docId, dhfConfig` |

## packages/core/src/dhf/directive-parser.ts

- Symbols: 3
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 46 | `parseDirectives` | function_declaration | yes | no | `content` |
| 63 | `parseInner` | function_declaration | no | no | `raw, inner, offset` |
| 105 | `applyDirectives` | function_declaration | yes | no | `content, resolver` |

## packages/core/src/dhf/document-compiler.ts

- Symbols: 6
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 58 | `generateToc` | function_declaration | no | no | `markdown` |
| 76 | `generateGlossary` | function_declaration | no | no | `ctx` |
| 102 | `compileMarkdownDocument` | function_declaration | yes | yes | `options` |
| 205 | `batchCompileMarkdown` | function_declaration | yes | yes | `options` |
| 238 | `getNestedValue` | function_declaration | no | no | `obj, key` |
| 250 | `loadDhfMarkdownFile` | function_declaration | yes | no | `filePath` |

## packages/core/src/dhf/document-ir.ts

- Symbols: 11
- Exported symbols: 11

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 183 | `text` | function_declaration | yes | no | `value, opts` |
| 187 | `xref` | function_declaration | yes | no | `elementId, label, kind` |
| 191 | `heading` | function_declaration | yes | no | `level, title, id` |
| 195 | `paragraph` | function_declaration | yes | no | `content` |
| 199 | `table` | function_declaration | yes | no | `headers, rows, caption` |
| 210 | `list` | function_declaration | yes | no | `items, ordered` |
| 214 | `badge` | function_declaration | yes | no | `label, variant` |
| 218 | `metric` | function_declaration | yes | no | `label, value, opts` |
| 222 | `metricGroup` | function_declaration | yes | no | `metrics` |
| 226 | `progress` | function_declaration | yes | no | `label, value, max, color` |
| 230 | `divider` | function_declaration | yes | no | `` |

## packages/core/src/dhf/document-registry.ts

- Symbols: 3
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 323 | `getDocumentType` | function_declaration | yes | no | `id` |
| 328 | `getDocumentsByGroup` | function_declaration | yes | no | `group` |
| 334 | `getAllDocumentIds` | function_declaration | yes | no | `` |

## packages/core/src/dhf/export-plugin.ts

- Symbols: 3
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 34 | `registerPlugin` | function_declaration | yes | no | `plugin` |
| 38 | `getPlugin` | function_declaration | yes | no | `format` |
| 42 | `getAvailableFormats` | function_declaration | yes | no | `` |

## packages/core/src/dhf/exporters/docx-exporter.ts

- Symbols: 7
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 16 | `DocxExportPlugin.render` | class_method | yes | yes | `doc` |
| 31 | `renderWordCompatibleHtml` | function_declaration | no | no | `doc` |
| 94 | `esc` | function_declaration | no | no | `s` |
| 98 | `renderBlock` | function_declaration | no | no | `block` |
| 118 | `renderInline` | function_declaration | no | no | `inline` |
| 130 | `renderTable` | function_declaration | no | no | `t` |
| 142 | `renderList` | function_declaration | no | no | `l` |

## packages/core/src/dhf/exporters/html-exporter.ts

- Symbols: 16
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 14 | `esc` | function_declaration | no | no | `s` |
| 23 | `HtmlExportPlugin.render` | class_method | yes | yes | `doc` |
| 29 | `renderDocument` | function_declaration | no | no | `doc` |
| 98 | `renderStatusBadgeInline` | function_declaration | no | no | `status` |
| 104 | `renderBlock` | function_declaration | no | no | `block` |
| 119 | `renderHeading` | function_declaration | no | no | `h` |
| 124 | `renderParagraph` | function_declaration | no | no | `p` |
| 129 | `renderInline` | function_declaration | no | no | `inline` |
| 136 | `renderText` | function_declaration | no | no | `t` |
| 146 | `renderXref` | function_declaration | no | no | `x` |
| 150 | `renderTable` | function_declaration | no | no | `t` |
| 173 | `renderList` | function_declaration | no | no | `l` |
| 179 | `renderBadge` | function_declaration | no | no | `b` |
| 183 | `renderMetric` | function_declaration | no | no | `m` |
| 191 | `renderMetricGroup` | function_declaration | no | no | `mg` |
| 195 | `renderProgress` | function_declaration | no | no | `p` |

## packages/core/src/dhf/exporters/markdown-exporter.ts

- Symbols: 8
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 18 | `MarkdownExportPlugin.render` | class_method | yes | yes | `doc` |
| 24 | `renderDocument` | function_declaration | no | no | `doc` |
| 93 | `renderBlock` | function_declaration | no | no | `block` |
| 116 | `renderParagraph` | function_declaration | no | no | `p` |
| 120 | `renderInline` | function_declaration | no | no | `inline` |
| 127 | `renderText` | function_declaration | no | no | `t` |
| 137 | `renderTable` | function_declaration | no | no | `t` |
| 150 | `renderList` | function_declaration | no | no | `l` |

## packages/core/src/dhf/query-engine.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 65 | `createQueryContext` | function_declaration | yes | no | `model, validation, completeness, config` |

## packages/core/src/dhf/query-executor.ts

- Symbols: 14
- Exported symbols: 4

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 56 | `parseMemoQuery` | function_declaration | yes | no | `blockContent` |
| 68 | `executeQuery` | function_declaration | yes | no | `spec, ctx` |
| 107 | `applyFilter` | function_declaration | no | no | `elements, where` |
| 129 | `applyTraverse` | function_declaration | no | no | `seeds, traverse, ctx` |
| 160 | `getField` | function_declaration | no | no | `el, field` |
| 174 | `renderQueryResult` | function_declaration | yes | no | `spec, elements, ctx` |
| 196 | `resolveColumns` | function_declaration | no | no | `spec` |
| 204 | `renderTable` | function_declaration | no | no | `spec, elements` |
| 218 | `renderList` | function_declaration | no | no | `spec, elements` |
| 222 | `renderGrouped` | function_declaration | no | no | `spec, elements` |
| 240 | `renderMatrix` | function_declaration | no | no | `spec, elements, ctx` |
| 262 | `renderMetric` | function_declaration | no | no | `spec, elements` |
| 271 | `capitalize` | function_declaration | no | no | `s` |
| 279 | `processMemoQueryBlocks` | function_declaration | yes | no | `content, ctx` |

## packages/core/src/dhf/script-runner.ts

- Symbols: 8
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 30 | `buildAPI` | function_declaration | no | no | `ctx, projectMeta` |
| 32 | `query` | object_method | no | no | `spec` |
| 35 | `table` | object_method | no | no | `elements, columns` |
| 38 | `list` | object_method | no | no | `elements` |
| 41 | `count` | object_method | no | no | `elements, label` |
| 44 | `md` | object_method | no | no | `strings, values` |
| 54 | `executeScript` | function_declaration | yes | no | `scriptSource, ctx, projectMeta` |
| 93 | `processMemoScriptBlocks` | function_declaration | yes | no | `content, ctx, projectMeta` |

## packages/core/src/dhf/snapshot.ts

- Symbols: 7
- Exported symbols: 6

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 40 | `createSnapshot` | function_declaration | yes | no | `doc, label` |
| 61 | `hashSection` | function_declaration | no | no | `section` |
| 78 | `saveSnapshot` | function_declaration | yes | no | `projectDir, snapshot` |
| 88 | `loadSnapshots` | function_declaration | yes | no | `projectDir, documentId` |
| 100 | `loadLatestSnapshot` | function_declaration | yes | no | `projectDir, documentId` |
| 128 | `diffSnapshots` | function_declaration | yes | no | `baseline, current` |
| 182 | `generateRedlineDocument` | function_declaration | yes | no | `diff` |

## packages/core/src/dhf/template-engine.ts

- Symbols: 15
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 28 | `compileDocument` | function_declaration | yes | no | `input` |
| 65 | `sectionIsRequired` | function_declaration | no | no | `docType, sectionId` |
| 78 | `defaultSectionGenerator` | function_declaration | no | no | `sectionDef, docType, ctx` |
| 111 | `rmpScope` | function_declaration | no | no | `sectionDef, _docType, ctx, dhfConfig` |
| 124 | `rmpRiskPolicy` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 152 | `rmpVerification` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 179 | `harHazardId` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 208 | `harRiskControls` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 233 | `rtmRequirements` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 258 | `rtmCoverage` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 290 | `rtmGaps` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 320 | `sadOverview` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 351 | `soupInventory` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 376 | `dhfIndexDocList` | function_declaration | no | no | `sectionDef, _docType, ctx` |
| 398 | `dhfIndexStatus` | function_declaration | no | no | `sectionDef, _docType, ctx` |

## packages/core/src/dhf/template-resolver.ts

- Symbols: 9
- Exported symbols: 6

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 44 | `parseFrontmatter` | function_declaration | yes | no | `content` |
| 64 | `resolveTemplatePath` | function_declaration | yes | no | `templateId, customTemplateDir` |
| 75 | `buildCandidatePaths` | function_declaration | no | no | `templateId, customDir` |
| 103 | `loadTemplate` | function_declaration | yes | no | `templateId, customTemplateDir` |
| 123 | `resolveIncludes` | function_declaration | yes | no | `content, baseDir, customTemplateDir, depth` |
| 160 | `resolveProjectDirectives` | function_declaration | yes | no | `content, projectMeta` |
| 171 | `getNestedValue` | function_declaration | no | no | `obj, key` |
| 192 | `listBuiltinTemplates` | function_declaration | yes | no | `` |
| 195 | `scan` | function_declaration | no | no | `dir, standard` |

## packages/core/src/import/column-mapper.ts

- Symbols: 6
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 26 | `inferColumnMappings` | function_declaration | yes | no | `headers, recipe` |
| 90 | `applyColumnMappings` | function_declaration | yes | no | `rawRows, mappings, config, defaultKind` |
| 171 | `applyTransform` | function_declaration | no | no | `value, transform` |
| 189 | `sanitizeId` | function_declaration | no | no | `raw` |
| 199 | `toCamelCase` | function_declaration | no | no | `s` |
| 209 | `escapeCsv` | function_declaration | no | no | `value` |

## packages/core/src/import/import-diff.ts

- Symbols: 3
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 62 | `computeImportDiff` | function_declaration | yes | no | `model, incoming, detectRemovals` |
| 112 | `diffElement` | function_declaration | no | no | `current, incoming` |
| 147 | `formatDiffSummary` | function_declaration | yes | no | `diff` |

## packages/core/src/import/recipes.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 171 | `findRecipe` | function_declaration | yes | no | `id` |

## packages/core/src/importer/cameo-importer.ts

- Symbols: 10
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 157 | `importCameoXml` | function_declaration | yes | no | `xmlContent, kindRegistry, relRegistry` |
| 316 | `importCameoJson` | function_declaration | yes | no | `jsonData, kindRegistry, relRegistry` |
| 408 | `cameoResultToSysml` | function_declaration | yes | no | `result, packageName` |
| 470 | `resolveCameoKind` | function_declaration | no | no | `xmiType, stereotypes, kindRegistry` |
| 487 | `resolveRelType` | function_declaration | no | no | `xmiType, relRegistry` |
| 495 | `resolveConstruct` | function_declaration | no | no | `memoKind, kindRegistry` |
| 511 | `toSysmlId` | function_declaration | no | no | `name` |
| 519 | `escapeString` | function_declaration | no | no | `s` |
| 523 | `escapeDoc` | function_declaration | no | no | `s` |
| 527 | `capitalizeFirst` | function_declaration | no | no | `s` |

## packages/core/src/importer/ea-importer.ts

- Symbols: 9
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 191 | `importEaJson` | function_declaration | yes | no | `jsonData, kindRegistry, relRegistry` |
| 311 | `eaResultToSysml` | function_declaration | yes | no | `result, packageName` |
| 374 | `resolveKind` | function_declaration | no | no | `eaType, stereotype, kindRegistry` |
| 394 | `resolveRelType` | function_declaration | no | no | `eaType, stereotype, relRegistry` |
| 414 | `resolveConstruct` | function_declaration | no | no | `memoKind, kindRegistry` |
| 431 | `toSysmlId` | function_declaration | no | no | `name` |
| 439 | `escapeString` | function_declaration | no | no | `s` |
| 443 | `escapeDoc` | function_declaration | no | no | `s` |
| 447 | `capitalizeFirst` | function_declaration | no | no | `s` |

## packages/core/src/importer/owl-importer.ts

- Symbols: 16
- Exported symbols: 4

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 83 | `importOwlTurtle` | function_declaration | yes | no | `turtleContent` |
| 194 | `importJsonLd` | function_declaration | yes | no | `jsonContent` |
| 277 | `owlResultToSysml` | function_declaration | yes | no | `result, packageName` |
| 342 | `owlResultToPackage` | function_declaration | yes | no | `result, packageName` |
| 440 | `expandPrefix` | function_declaration | no | no | `prefix, localName, prefixes` |
| 445 | `extractLocalName` | function_declaration | no | no | `uri` |
| 458 | `extractStringProperty` | function_declaration | no | no | `body, property` |
| 467 | `normalizeType` | function_declaration | no | no | `type` |
| 473 | `extractValue` | function_declaration | no | no | `v` |
| 480 | `deriveLayerFromName` | function_declaration | no | no | `name` |
| 496 | `deriveConstruct` | function_declaration | no | no | `name` |
| 507 | `toSysmlPackageName` | function_declaration | no | no | `name` |
| 515 | `toCamelCase` | function_declaration | no | no | `name` |
| 519 | `capitalizeFirst` | function_declaration | no | no | `s` |
| 523 | `escapeString` | function_declaration | no | no | `s` |
| 527 | `escapeDoc` | function_declaration | no | no | `s` |

## packages/core/src/importer/sysand-importer.ts

- Symbols: 3
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 66 | `collectSysmlFiles` | function_declaration | no | no | `dir` |
| 93 | `importSysandProject` | function_declaration | yes | yes | `projectDir` |
| 204 | `verifySysandRoundTrip` | function_declaration | yes | no | `originalKinds, originalRels, importedKinds, importedRels` |

## packages/core/src/language/generated/ast.ts

- Symbols: 56
- Exported symbols: 56

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 74 | `isActionDefBodyMember` | function_declaration | yes | no | `item` |
| 82 | `isActionUsageBodyMember` | function_declaration | yes | no | `item` |
| 90 | `isAttributeValue` | function_declaration | yes | no | `item` |
| 98 | `isConnectionBodyMember` | function_declaration | yes | no | `item` |
| 106 | `isDefinitionBodyMember` | function_declaration | yes | no | `item` |
| 114 | `isDefinitionMember` | function_declaration | yes | no | `item` |
| 120 | `isDottedName` | function_declaration | yes | no | `item` |
| 126 | `isFeatureName` | function_declaration | yes | no | `item` |
| 132 | `isImportPath` | function_declaration | yes | no | `item` |
| 140 | `isNamespaceMember` | function_declaration | yes | no | `item` |
| 148 | `isPackageMember` | function_declaration | yes | no | `item` |
| 154 | `isQualifiedName` | function_declaration | yes | no | `item` |
| 160 | `isSuccessionRef` | function_declaration | yes | no | `item` |
| 168 | `isUsageBodyMember` | function_declaration | yes | no | `item` |
| 176 | `isUsageMember` | function_declaration | yes | no | `item` |
| 190 | `isActionDefinition` | function_declaration | yes | no | `item` |
| 204 | `isActionParameterMember` | function_declaration | yes | no | `item` |
| 218 | `isActionUsage` | function_declaration | yes | no | `item` |
| 231 | `isAllocateUsage` | function_declaration | yes | no | `item` |
| 245 | `isAttributeDefinition` | function_declaration | yes | no | `item` |
| 260 | `isAttributeMember` | function_declaration | yes | no | `item` |
| 272 | `isBooleanValue` | function_declaration | yes | no | `item` |
| 286 | `isConnectionDefinition` | function_declaration | yes | no | `item` |
| 299 | `isConnectionEnd` | function_declaration | yes | no | `item` |
| 313 | `isConnectionUsage` | function_declaration | yes | no | `item` |
| 325 | `isDocComment` | function_declaration | yes | no | `item` |
| 339 | `isEndDeclaration` | function_declaration | yes | no | `item` |
| 352 | `isEnumDefinition` | function_declaration | yes | no | `item` |
| 364 | `isEnumLiteral` | function_declaration | yes | no | `item` |
| 376 | `isEnumValue` | function_declaration | yes | no | `item` |
| 390 | `isFlowConnectionUsage` | function_declaration | yes | no | `item` |
| 402 | `isFlowEnd` | function_declaration | yes | no | `item` |
| 414 | `isImportDeclaration` | function_declaration | yes | no | `item` |
| 428 | `isInterfaceDefinition` | function_declaration | yes | no | `item` |
| 440 | `isIntValue` | function_declaration | yes | no | `item` |
| 454 | `isItemDefinition` | function_declaration | yes | no | `item` |
| 465 | `isModel` | function_declaration | yes | no | `item` |
| 480 | `isMultiplicity` | function_declaration | yes | no | `item` |
| 494 | `isPackageDeclaration` | function_declaration | yes | no | `item` |
| 508 | `isPartDefinition` | function_declaration | yes | no | `item` |
| 522 | `isPartMember` | function_declaration | yes | no | `item` |
| 536 | `isPartUsage` | function_declaration | yes | no | `item` |
| 550 | `isPortDefinition` | function_declaration | yes | no | `item` |
| 564 | `isPortUsage` | function_declaration | yes | no | `item` |
| 578 | `isRequirementDefinition` | function_declaration | yes | no | `item` |
| 592 | `isRequirementUsage` | function_declaration | yes | no | `item` |
| 604 | `isSpecialization` | function_declaration | yes | no | `item` |
| 616 | `isStringValue` | function_declaration | yes | no | `item` |
| 628 | `isSuccessionStep` | function_declaration | yes | no | `item` |
| 640 | `isSuccessionUsage` | function_declaration | yes | no | `item` |
| 654 | `isViewDefinition` | function_declaration | yes | no | `item` |
| 668 | `isViewpointDefinition` | function_declaration | yes | no | `item` |
| 724 | `MemoSysMLAstReflection.getAllTypes` | class_method | yes | no | `` |
| 728 | `MemoSysMLAstReflection.computeIsSubtype` | class_method | yes | no | `subtype, supertype` |
| 796 | `MemoSysMLAstReflection.getReferenceType` | class_method | yes | no | `refInfo` |
| 805 | `MemoSysMLAstReflection.getTypeMetaData` | class_method | yes | no | `type` |

## packages/core/src/language/generated/grammar.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 10 | `MemoSysMLGrammar` | arrow_function | yes | no | `` |

## packages/core/src/language/memo-sysml-module.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 39 | `createMemoSysMLServices` | function_declaration | yes | no | `context` |

## packages/core/src/llm/ask-engine.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 39 | `askModel` | function_declaration | yes | yes | `question, ctx, provider, contextOptions` |

## packages/core/src/llm/draft-engine.ts

- Symbols: 8
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 71 | `draftDocument` | function_declaration | yes | yes | `ctx, provider, options` |
| 175 | `determineSectionsToFill` | function_declaration | no | no | `docType, existing, targetSections` |
| 196 | `createEmptyDocument` | function_declaration | no | no | `docType` |
| 219 | `parseDraftResponse` | function_declaration | no | no | `content` |
| 241 | `convertMarkdownToBlocks` | function_declaration | no | no | `markdown, sectionTitle` |
| 317 | `parseInlineFormatting` | function_declaration | no | no | `content` |
| 324 | `parseMarkdownTable` | function_declaration | no | no | `lines` |
| 327 | `parseRow` | arrow_function | no | no | `line` |

## packages/core/src/llm/generate-engine.ts

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 69 | `generateSysml` | function_declaration | yes | yes | `description, config, provider` |
| 100 | `parseGenerateResponse` | function_declaration | no | no | `content` |

## packages/core/src/llm/llm-provider.ts

- Symbols: 6
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 45 | `resolveLLMConfig` | function_declaration | yes | no | `` |
| 70 | `createProvider` | function_declaration | yes | no | `config` |
| 79 | `createOpenAIProvider` | function_declaration | no | no | `config` |
| 84 | `complete` | object_method | no | yes | `options` |
| 119 | `createAnthropicProvider` | function_declaration | no | no | `config` |
| 124 | `complete` | object_method | no | yes | `options` |

## packages/core/src/llm/model-context.ts

- Symbols: 2
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 33 | `serializeModelContext` | function_declaration | yes | no | `ctx, options` |
| 161 | `serializeOntologyContext` | function_declaration | yes | no | `config` |

## packages/core/src/model/builder.ts

- Symbols: 17
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 111 | `resolveKindDef` | function_declaration | no | no | `typeName, config, registries` |
| 160 | `buildMemoModel` | function_declaration | yes | no | `documents, config, parseErrors, registries` |
| 280 | `extractFromModel` | function_declaration | no | no | `model, filePath, config, elements, deferredConnections, deferredFlows, deferredSuccessions, deferredAllocates, errors, registry, registries` |
| 300 | `extractFromPackage` | function_declaration | no | no | `pkg, filePath, parentPackage, config, elements, deferredConnections, deferredFlows, deferredSuccessions, deferredAllocates, errors, registry, registries` |
| 363 | `extractUsage` | function_declaration | no | no | `usage, construct, filePath, packageName, config, elements, registry, registries` |
| 406 | `extractActionDefinition` | function_declaration | no | no | `actionDef, filePath, packageName, config, elements, registry` |
| 453 | `extractItemDefinition` | function_declaration | no | no | `itemDef, filePath, packageName, config, elements, registry` |
| 486 | `extractActionUsage` | function_declaration | no | no | `usage, filePath, packageName, config, elements, deferredFlows, deferredSuccessions, registry, registries, parentActionId` |
| 568 | `resolveConnection` | function_declaration | no | no | `conn, filePath, packageName, config, relationships, registry, allElementIds` |
| 608 | `resolveFlowConnection` | function_declaration | no | no | `flow, filePath, packageName, parentActionId, relationships, allElementIds` |
| 650 | `resolveSuccession` | function_declaration | no | no | `succession, filePath, packageName, parentActionId, relationships, allElementIds` |
| 695 | `resolveAllocate` | function_declaration | no | no | `allocate, filePath, packageName, elements, relationships, registry, allElementIds` |
| 736 | `extractAttributes` | function_declaration | no | no | `body` |
| 754 | `extractAttributeValue` | function_declaration | no | no | `value` |
| 770 | `extractDocComment` | function_declaration | no | no | `body` |
| 785 | `resolveRef` | function_declaration | no | no | `ref` |
| 797 | `normalizeRelType` | function_declaration | no | no | `name` |

## packages/core/src/model/config-loader.ts

- Symbols: 10
- Exported symbols: 6

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 17 | `findConfigFile` | function_declaration | yes | no | `startDir` |
| 45 | `loadRenderingLayers` | function_declaration | yes | no | `configDir` |
| 65 | `loadClosureRules` | function_declaration | yes | no | `configDir` |
| 85 | `loadViewpoints` | function_declaration | yes | no | `configDir` |
| 107 | `isPackageFile` | function_declaration | no | no | `filePath` |
| 118 | `loadConfig` | function_declaration | yes | no | `filePath` |
| 195 | `resolveConfig` | function_declaration | yes | no | `config, loader` |
| 213 | `dedup` | function_declaration | no | no | `arr, key` |
| 222 | `mergeViewpoints` | function_declaration | no | no | `parentVps, childVps` |
| 257 | `mergeConfigs` | function_declaration | no | no | `parent, child` |

## packages/core/src/model/kind-registry.ts

- Symbols: 10
- Exported symbols: 10

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 76 | `KindRegistry.getKind` | class_method | yes | no | `name` |
| 83 | `KindRegistry.toKindDefinition` | class_method | yes | no | `name` |
| 97 | `KindRegistry.toKindsRecord` | class_method | yes | no | `` |
| 110 | `KindRegistry.has` | class_method | yes | no | `name` |
| 115 | `KindRegistry.kindNames` | class_method | yes | no | `` |
| 120 | `KindRegistry.entries` | class_method | yes | no | `` |
| 125 | `KindRegistry.register` | class_method | yes | no | `entry` |
| 133 | `KindRegistry.computeDerivedBy` | class_method | yes | no | `` |
| 154 | `KindRegistry.populateFromDocuments` | class_method | yes | no | `documents` |
| 168 | `KindRegistry.walkPackage` | class_method | yes | no | `pkg, layer` |

## packages/core/src/model/layer-resolver.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 21 | `resolveLayerFromPath` | function_declaration | yes | no | `filePath` |

## packages/core/src/model/ontology-loader.ts

- Symbols: 12
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 100 | `parseConstructsInFile` | function_declaration | no | no | `filePath` |
| 143 | `buildLayers` | function_declaration | no | no | `sysmlDir` |
| 206 | `buildRelationshipTypes` | function_declaration | no | no | `sysmlDir` |
| 226 | `readYamlField` | function_declaration | no | no | `content, field` |
| 234 | `readSelectedOntologies` | function_declaration | no | no | `configPath` |
| 250 | `buildPackageInfo` | function_declaration | no | no | `pkgDir, selected` |
| 280 | `getPackageMetadata` | function_declaration | yes | no | `projectRoot` |
| 371 | `collectSysmlFiles` | function_declaration | no | no | `dir` |
| 398 | `findOntologyPackageDirs` | function_declaration | no | no | `configPath` |
| 441 | `walkExtendsChain` | function_declaration | no | no | `configPath, dirs, seen` |
| 507 | `resolvePackageConfig` | function_declaration | no | no | `packageName, fromDir` |
| 539 | `loadOntologyRegistries` | function_declaration | yes | yes | `configPath` |

## packages/core/src/model/package-registry.ts

- Symbols: 10
- Exported symbols: 9

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 56 | `PackageRegistry.buildFromDocuments` | class_method | yes | no | `documents` |
| 67 | `PackageRegistry.registerElement` | class_method | yes | no | `elementId, packageName` |
| 76 | `PackageRegistry.getPackageForElement` | class_method | yes | no | `elementId` |
| 81 | `PackageRegistry.getPackages` | class_method | yes | no | `` |
| 86 | `PackageRegistry.getPackage` | class_method | yes | no | `qualifiedName` |
| 91 | `PackageRegistry.isLibraryPackage` | class_method | yes | no | `qualifiedName` |
| 104 | `PackageRegistry.resolveElementId` | class_method | yes | no | `ref, fromPackage, allElementIds` |
| 150 | `PackageRegistry.collectPackages` | class_method | yes | no | `model, filePath` |
| 158 | `PackageRegistry.collectPackage` | class_method | yes | no | `pkg, filePath, parentQualifiedName` |
| 198 | `parseImport` | function_declaration | no | no | `path` |

## packages/core/src/model/parser-utils.ts

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 34 | `parseFiles` | function_declaration | yes | yes | `filePaths, basePath` |
| 84 | `relativePath` | function_declaration | no | no | `filePath, basePath` |

## packages/core/src/model/relationship-registry.ts

- Symbols: 11
- Exported symbols: 10

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 42 | `pascalToCamelCase` | function_declaration | yes | no | `name` |
| 51 | `pascalToLabel` | function_declaration | no | no | `name` |
| 71 | `RelationshipRegistry.getRelType` | class_method | yes | no | `name` |
| 80 | `RelationshipRegistry.toRelationshipType` | class_method | yes | no | `name` |
| 95 | `RelationshipRegistry.toRelationshipTypesArray` | class_method | yes | no | `` |
| 105 | `RelationshipRegistry.has` | class_method | yes | no | `name` |
| 110 | `RelationshipRegistry.relTypeNames` | class_method | yes | no | `` |
| 115 | `RelationshipRegistry.entries` | class_method | yes | no | `` |
| 120 | `RelationshipRegistry.register` | class_method | yes | no | `entry` |
| 128 | `RelationshipRegistry.populateFromDocuments` | class_method | yes | no | `documents` |
| 142 | `RelationshipRegistry.walkPackage` | class_method | yes | no | `pkg, layer` |

## packages/core/src/model/semantic.ts

- Symbols: 2
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 166 | `modelToDTO` | function_declaration | yes | no | `model, options` |
| 185 | `dtoToModel` | function_declaration | yes | no | `dto` |

## packages/core/src/model/short-id.ts

- Symbols: 7
- Exported symbols: 4

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 71 | `splitCamelCase` | function_declaration | no | no | `s` |
| 79 | `abbreviateWord` | function_declaration | no | no | `word` |
| 90 | `derivePrefix` | function_declaration | no | no | `kind` |
| 100 | `kindToPrefix` | function_declaration | yes | no | `kind` |
| 108 | `prefixToFamily` | function_declaration | yes | no | `prefix` |
| 123 | `assignSequentialShortIds` | function_declaration | yes | no | `kind, elementIds` |
| 141 | `parseShortId` | function_declaration | yes | no | `shortId` |

## packages/core/src/plugin/plugin-loader.ts

- Symbols: 7
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 32 | `loadPlugins` | function_declaration | yes | yes | `entries, projectDir, registry` |
| 63 | `loadSinglePlugin` | function_declaration | no | yes | `entry, projectDir` |
| 105 | `resolveModulePath` | function_declaration | no | no | `moduleName, projectDir` |
| 124 | `loadPluginManifest` | function_declaration | yes | no | `pluginDir` |
| 139 | `parseSimpleYaml` | function_declaration | no | no | `content` |
| 167 | `loadPluginConfig` | function_declaration | yes | no | `projectDir` |
| 181 | `parsePluginEntries` | function_declaration | no | no | `content` |

## packages/core/src/plugin/plugin-registry.ts

- Symbols: 20
- Exported symbols: 20

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 31 | `PluginRegistry.register` | class_method | yes | no | `plugin` |
| 36 | `PluginRegistry.unregister` | class_method | yes | no | `id` |
| 41 | `PluginRegistry.get` | class_method | yes | no | `id` |
| 46 | `PluginRegistry.getExport` | class_method | yes | no | `id` |
| 51 | `PluginRegistry.getAnalysis` | class_method | yes | no | `id` |
| 56 | `PluginRegistry.getValidation` | class_method | yes | no | `id` |
| 61 | `PluginRegistry.getGenerator` | class_method | yes | no | `id` |
| 67 | `PluginRegistry.list` | class_method | yes | no | `type` |
| 73 | `PluginRegistry.listExports` | class_method | yes | no | `` |
| 78 | `PluginRegistry.listAnalysis` | class_method | yes | no | `` |
| 83 | `PluginRegistry.listValidation` | class_method | yes | no | `` |
| 88 | `PluginRegistry.listGenerators` | class_method | yes | no | `` |
| 93 | `PluginRegistry.has` | class_method | yes | no | `id` |
| 98 | `PluginRegistry.clear` | class_method | yes | no | `` |
| 105 | `PluginRegistry.runExport` | class_method | yes | yes | `id, doc, ctx, options` |
| 117 | `PluginRegistry.runAnalysis` | class_method | yes | yes | `id, ctx, options` |
| 128 | `PluginRegistry.runValidation` | class_method | yes | yes | `id, ctx, options` |
| 139 | `PluginRegistry.runAllValidation` | class_method | yes | yes | `ctx, options` |
| 152 | `PluginRegistry.runGenerator` | class_method | yes | yes | `id, ctx, options` |
| 163 | `PluginRegistry.runAllGenerators` | class_method | yes | yes | `ctx, options` |

## packages/core/src/plugin/plugin-scaffold.ts

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 25 | `scaffoldPlugin` | function_declaration | yes | no | `options` |
| 110 | `generatePluginSource` | function_declaration | no | no | `id, name, type` |
| 239 | `generatePluginTest` | function_declaration | no | no | `id, type` |

## packages/core/src/serializer/csv-io.ts

- Symbols: 11
- Exported symbols: 7

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 55 | `attachProvenance` | function_declaration | yes | no | `elements, meta` |
| 89 | `parseCsvLine` | function_declaration | no | no | `line` |
| 123 | `escapeCsvField` | function_declaration | no | no | `value` |
| 131 | `parseCsvText` | function_declaration | no | no | `csvText` |
| 161 | `parseElementsCsv` | function_declaration | yes | no | `csvText, config` |
| 281 | `exportElementsCsv` | function_declaration | yes | no | `model, _config` |
| 330 | `parseRelationshipsCsv` | function_declaration | yes | no | `csvText, config, knownElementIds` |
| 415 | `exportRelationshipsCsv` | function_declaration | yes | no | `model` |
| 432 | `sysmlConstructToUsage` | function_declaration | no | no | `sysmlConstruct` |
| 450 | `generateElementTemplate` | function_declaration | yes | no | `config` |
| 485 | `generateRelationshipTemplate` | function_declaration | yes | no | `config` |

## packages/core/src/serializer/sysml-generator.ts

- Symbols: 5
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 11 | `generateUsage` | function_declaration | yes | no | `element` |
| 55 | `generateConnection` | function_declaration | yes | no | `rel` |
| 67 | `generateFile` | function_declaration | yes | no | `elements, relationships, packageName` |
| 110 | `escapeString` | function_declaration | no | no | `s` |
| 114 | `capitalizeFirst` | function_declaration | no | no | `s` |

## packages/core/src/validator/behavior-validator.ts

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 19 | `validateBehavior` | function_declaration | yes | no | `model` |
| 124 | `getParams` | function_declaration | no | no | `element, defParams` |

## packages/core/src/validator/rule-engine.ts

- Symbols: 8
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 16 | `validateModel` | function_declaration | yes | no | `model, config` |
| 34 | `evaluateClosureRules` | function_declaration | yes | no | `model, config` |
| 81 | `evaluateRule` | function_declaration | no | no | `rule, element, model` |
| 129 | `checkRequireRelationship` | function_declaration | no | no | `element, relType, min, max, model, direction, relatedKinds` |
| 146 | `getRelevantRelationships` | function_declaration | no | no | `element, relType, model, direction, relatedKinds` |
| 179 | `checkRequireAttribute` | function_declaration | no | no | `element, attribute` |
| 184 | `checkUniqueAttribute` | function_declaration | no | no | `element, attribute, model` |
| 193 | `checkCondition` | function_declaration | no | no | `element, condition` |

## packages/ontology-core/src/export/owl-exporter.ts

- Symbols: 5
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 40 | `exportToOwlTurtle` | function_declaration | yes | no | `config, namespace` |
| 119 | `exportToOwlXml` | function_declaration | yes | no | `config, namespace` |
| 166 | `capitalize` | function_declaration | no | no | `s` |
| 170 | `escape` | function_declaration | no | no | `s` |
| 174 | `escapeXml` | function_declaration | no | no | `s` |

## packages/ontology-medical/src/export/owl-exporter.ts

- Symbols: 4
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 27 | `exportToOwlTurtle` | function_declaration | yes | no | `config, namespace` |
| 73 | `exportToOwlXml` | function_declaration | yes | no | `config, namespace` |
| 107 | `escape` | function_declaration | no | no | `s` |
| 111 | `escapeXml` | function_declaration | no | no | `s` |

## packages/web/src/App.tsx

- Symbols: 11
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 39 | `UnifiedCanvas` | function_declaration | no | no | `` |
| 54 | `renderView` | arrow_function | no | no | `` |
| 112 | `ViewLoadingFallback` | function_declaration | no | no | `` |
| 125 | `WelcomeCanvas` | function_declaration | no | no | `` |
| 144 | `openElement` | function_declaration | no | no | `id` |
| 255 | `App` | function_declaration | yes | no | `` |
| 269 | `handler` | arrow_function | no | no | `e` |
| 460 | `FamilyRoute` | function_declaration | no | no | `` |
| 466 | `ElementPermalinkRoute` | function_declaration | no | no | `` |
| 492 | `DiagramPermalinkRoute` | function_declaration | no | no | `` |
| 521 | `UrlNavigationSync` | function_declaration | no | no | `` |

## packages/web/src/analysis/consistency.ts

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 40 | `analyzeConsistency` | function_declaration | yes | no | `model` |

## packages/web/src/analysis/dsm.ts

- Symbols: 5
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 34 | `computeDSM` | function_declaration | yes | no | `model, options` |
| 82 | `clusterDSM` | function_declaration | no | no | `elementIds, matrix` |
| 87 | `find` | function_declaration | no | no | `x` |
| 91 | `union` | function_declaration | no | no | `a, b` |
| 118 | `reorderDSM` | function_declaration | yes | no | `dsm` |

## packages/web/src/components/Breadcrumb.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 5 | `Breadcrumb` | function_declaration | yes | no | `` |

## packages/web/src/components/BulkEditPanel.tsx

- Symbols: 4
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 13 | `sectionStyle` | function_declaration | no | no | `color` |
| 19 | `EditableField` | function_declaration | no | no | `{
    placeholder,
    value,
    onChange,
}` |
| 48 | `ValueHint` | function_declaration | no | no | `{ values }` |
| 59 | `BulkEditPanel` | function_declaration | yes | no | `` |

## packages/web/src/components/BulkImportModal.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 34 | `parseTsvToRows` | function_declaration | no | no | `text` |
| 42 | `parse` | arrow_function | no | no | `line` |
| 60 | `BulkImportModal` | function_declaration | yes | no | `` |

## packages/web/src/components/CommandPalette.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 16 | `CommandPalette` | function_declaration | yes | no | `` |
| 30 | `handler` | arrow_function | no | no | `e` |

## packages/web/src/components/CompletenessBar.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 5 | `CompletenessBar` | function_declaration | yes | no | `` |

## packages/web/src/components/ContextMenu.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 31 | `ContextMenu` | function_declaration | yes | no | `{
    x, y, onClose, target,
    availableGroups = [],
    onCreateGroup, onMoveToGroup, onRemoveFromGroup,
    onAddTag, onRemoveTag, onDeleteGroup, onRenameGroup,
    onCollapseAll, onExpandAll,
    element, elementTags = [],
}` |
| 44 | `handler` | arrow_function | no | no | `e` |
| 67 | `MenuItem` | arrow_function | no | no | `{ label, icon, onClick, danger, disabled }` |
| 86 | `Separator` | arrow_function | no | no | `` |
| 87 | `SectionLabel` | arrow_function | no | no | `{ label }` |
| 96 | `handleSubmit` | arrow_function | no | no | `` |

## packages/web/src/components/ExplorerPanel.tsx

- Symbols: 39
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 21 | `ChevronIcon` | function_declaration | no | no | `{ expanded, size = 14, color = COLOR.muted }` |
| 46 | `FolderIcon` | function_declaration | no | no | `{ open, color = COLOR.muted }` |
| 62 | `ItemIcon` | function_declaration | no | no | `{ color = COLOR.muted }` |
| 84 | `ChangeTypeModal` | function_declaration | no | no | `{ elementId, currentKind, onClose }` |
| 90 | `handler` | arrow_function | no | no | `e` |
| 139 | `ElementContextMenu` | function_declaration | no | no | `{ menu, onClose }` |
| 150 | `handler` | arrow_function | no | no | `e` |
| 285 | `TabBar` | function_declaration | no | no | `{ active, onChange }` |
| 323 | `buildTree` | function_declaration | no | no | `elements` |
| 364 | `sortNodes` | arrow_function | no | no | `nodes` |
| 378 | `RecursiveTree` | function_declaration | no | no | `{
    nodes,
    level,
    expanded,
    toggleExpand,
    selectedElementId,
    selectElement,
    selectedElementIds,
    toggleElementSelection,
    violationCounts,
    baseColor,
    onContextMenu,
    onDragStart,
    onDrop,
    isUndefined,
}` |
| 564 | `buildLayerGroupsFromOntologies` | function_declaration | no | no | `availableOntologies, selectedOntologies` |
| 597 | `buildKindToLayerIdMap` | function_declaration | no | no | `availableOntologies, selectedOntologies` |
| 615 | `ModelExplorerContent` | function_declaration | no | no | `{ searchTerm }` |
| 774 | `countElements` | arrow_function | no | no | `nodes` |
| 826 | `countElements` | arrow_function | no | no | `nodes` |
| 877 | `findLayer` | arrow_function | no | no | `ns` |
| 888 | `collectIds` | arrow_function | no | no | `ns` |
| 984 | `DiagramTypeBadge` | function_declaration | no | no | `{ diagramType }` |
| 999 | `NewDiagramModal` | function_declaration | no | no | `{ viewpointId, onClose }` |
| 1006 | `handler` | arrow_function | no | no | `e` |
| 1013 | `handleCreate` | arrow_function | no | no | `` |
| 1060 | `CollapsibleSection` | function_declaration | no | no | `{ label, count, defaultOpen, children }` |
| 1082 | `ViewExplorerContent` | function_declaration | no | no | `{ searchTerm }` |
| 1092 | `toggleExpand` | arrow_function | no | no | `id` |
| 1103 | `filterDiagrams` | arrow_function | no | no | `diagrams` |
| 1117 | `renderDiagramList` | arrow_function | no | no | `diagrams, vpId` |
| 1240 | `DiagramRow` | function_declaration | no | no | `{ diag, isSelected, onSelect, onDelete }` |
| 1404 | `TemplatePicker` | function_declaration | no | no | `{ group, existingDocs, onConfirm, onClose }` |
| 1413 | `toggle` | function_declaration | no | no | `templateId` |
| 1422 | `handleConfirm` | function_declaration | no | no | `` |
| 1516 | `DhfExplorerContent` | function_declaration | no | no | `` |
| 1532 | `toggleGroup` | function_declaration | no | no | `id` |
| 1540 | `openContextMenu` | function_declaration | no | no | `e, groupId` |
| 1546 | `openPicker` | function_declaration | no | no | `groupId` |
| 1552 | `createDocuments` | function_declaration | no | no | `templates` |
| 1590 | `handler` | function_declaration | no | no | `` |
| 1761 | `AiToolButton` | function_declaration | no | no | `{ label, description, active, onClick }` |
| 1784 | `ExplorerPanel` | function_declaration | yes | no | `` |

## packages/web/src/components/GapBar.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 28 | `GapBar` | function_declaration | yes | no | `` |
| 77 | `onMouseMove` | arrow_function | no | no | `ev` |
| 82 | `onMouseUp` | arrow_function | no | no | `` |

## packages/web/src/components/ModeSwitcher.tsx

- Symbols: 4
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 45 | `ToolsDropdown` | function_declaration | no | no | `{ activeViewType }` |
| 55 | `handleClick` | function_declaration | no | no | `e` |
| 127 | `ModeSwitcher` | function_declaration | yes | no | `` |
| 152 | `handleNavClick` | function_declaration | no | no | `modeId` |

## packages/web/src/components/ModelExplorer.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 6 | `ModelExplorer` | function_declaration | yes | no | `` |
| 26 | `toggleLayer` | arrow_function | no | no | `layer` |
| 35 | `filterElements` | arrow_function | no | no | `elements` |

## packages/web/src/components/OnboardingTour.tsx

- Symbols: 3
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 69 | `OnboardingTour` | function_declaration | yes | no | `` |
| 114 | `positionStyle` | arrow_function | no | no | `` |
| 205 | `resetOnboardingTour` | function_declaration | yes | no | `` |

## packages/web/src/components/OntologyBrowserTab.tsx

- Symbols: 22
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 37 | `sortKindsParentFirst` | function_declaration | no | no | `kinds` |
| 42 | `getDepth` | function_declaration | no | no | `name` |
| 79 | `sortPackagesParentFirst` | function_declaration | no | no | `pkgs` |
| 84 | `getDepth` | function_declaration | no | no | `name` |
| 118 | `DeselectedConfirmDialog` | function_declaration | no | no | `{ pkgName, onCancel, onConfirm }` |
| 161 | `OntologyBrowserTab` | function_declaration | yes | no | `` |
| 248 | `handlePackageClick` | function_declaration | no | no | `pkgName` |
| 252 | `handleLayerClick` | function_declaration | no | no | `pkgName, layerId` |
| 256 | `handleKindClick` | function_declaration | no | no | `kindName, pkgName` |
| 261 | `togglePkg` | function_declaration | no | no | `name` |
| 269 | `toggleLayer` | function_declaration | no | no | `key` |
| 277 | `handleCheckboxChange` | function_declaration | no | no | `e, pkgName, isCurrentlySelected` |
| 287 | `handleSave` | function_declaration | no | no | `` |
| 297 | `handleOrphanKeep` | function_declaration | no | no | `` |
| 303 | `handleOrphanRemap` | function_declaration | no | no | `mappings` |
| 310 | `handleContextMenu` | function_declaration | no | no | `e, target` |
| 316 | `handleCtxViewTable` | function_declaration | no | no | `pkgName, layerId` |
| 322 | `handleCtxViewVisual` | function_declaration | no | no | `pkgName` |
| 328 | `handleCtxToggleSelection` | function_declaration | no | no | `pkgName` |
| 338 | `handleCtxViewProperties` | function_declaration | no | no | `kindName, pkgName` |
| 346 | `onKey` | function_declaration | no | no | `e` |
| 360 | `onClickOutside` | function_declaration | no | no | `` |

## packages/web/src/components/OntologyContextMenu.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 31 | `MenuItem` | function_declaration | no | no | `{ label, onClick, icon }` |
| 46 | `Divider` | function_declaration | no | no | `` |
| 50 | `OntologyContextMenu` | function_declaration | yes | no | `{
    x, y, target, onViewVisual, onViewTable, onToggleSelection, onViewProperties, onClose,
}` |

## packages/web/src/components/PropertiesPanel.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 6 | `DiagramProperties` | function_declaration | no | no | `` |
| 115 | `PropertiesPanel` | function_declaration | yes | no | `` |

## packages/web/src/components/Sidebar.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 5 | `Sidebar` | function_declaration | yes | no | `` |

## packages/web/src/components/TraceabilityPanel.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 79 | `LinkPicker` | function_declaration | no | no | `{ elementId, category, onClose }` |
| 250 | `TraceSection` | function_declaration | no | no | `{ elementId, category, rels, onNavigate }` |
| 372 | `TraceabilityPanel` | function_declaration | yes | no | `{ elementId }` |

## packages/web/src/components/UnifiedPropertiesPanel.tsx

- Symbols: 7
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 8 | `EditableField` | function_declaration | no | no | `{ value, onSave, multiline, forceEdit }` |
| 74 | `DiagramProperties` | function_declaration | no | no | `` |
| 181 | `ElementProperties` | function_declaration | no | no | `` |
| 198 | `handler` | arrow_function | no | no | `e` |
| 226 | `handleDocSave` | arrow_function | no | no | `newDoc` |
| 231 | `handleAttrSave` | arrow_function | no | no | `key, newValue` |
| 481 | `UnifiedPropertiesPanel` | function_declaration | yes | no | `` |

## packages/web/src/components/ViewpointBrowser.tsx

- Symbols: 13
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 13 | `DiagramTypeBadge` | function_declaration | no | no | `{ diagramType }` |
| 42 | `DiagramRowContextMenu` | function_declaration | no | no | `{ x, y, diag, onClose, onOpenDiagram, onShowTabular, onDiagramProperties }` |
| 46 | `handler` | arrow_function | no | no | `e` |
| 49 | `esc` | arrow_function | no | no | `e` |
| 61 | `Item` | arrow_function | no | no | `{ label, icon, onClick, stub }` |
| 93 | `DiagramRow` | function_declaration | no | no | `{ diag, isSelected, onSelect, onContextMenu }` |
| 135 | `ViewpointBrowser` | function_declaration | yes | no | `` |
| 166 | `openNewViewpoint` | function_declaration | no | no | `` |
| 171 | `openEditViewpoint` | function_declaration | no | no | `vp` |
| 176 | `handleEditorSave` | function_declaration | no | no | `vp` |
| 186 | `isUserCreated` | function_declaration | no | no | `vpId` |
| 190 | `toggleExpand` | arrow_function | no | no | `id` |
| 199 | `filterDiagramsBySearch` | arrow_function | no | no | `diagrams` |

## packages/web/src/components/ViewpointEditor.tsx

- Symbols: 5
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 21 | `CheckList` | function_declaration | no | no | `{
    label,
    options,
    selected,
    onChange,
    colorMap,
}` |
| 76 | `ViewpointEditor` | function_declaration | yes | no | `{ viewpoint, onSave, onClose }` |
| 95 | `handler` | arrow_function | no | no | `e` |
| 100 | `toggle` | function_declaration | no | no | `set, setFn, id` |
| 107 | `handleSave` | function_declaration | no | no | `` |

## packages/web/src/components/ViewpointSelector.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 3 | `ViewpointSelector` | function_declaration | yes | no | `` |

## packages/web/src/components/WorkbenchToolbar.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 8 | `WorkbenchToolbar` | function_declaration | yes | no | `` |
| 21 | `goHome` | function_declaration | no | no | `` |

## packages/web/src/components/WorkingSetsPanel.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 5 | `WorkingSetsPanel` | function_declaration | yes | no | `` |
| 36 | `handleSave` | arrow_function | no | no | `` |
| 42 | `handleRestore` | arrow_function | no | no | `id` |
| 50 | `handleUpdate` | arrow_function | no | no | `id` |
| 54 | `handleRename` | arrow_function | no | no | `id` |
| 61 | `viewLabel` | arrow_function | no | no | `state` |

## packages/web/src/components/WorkspaceManager.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 14 | `captureState` | function_declaration | no | no | `` |
| 28 | `restoreState` | function_declaration | no | no | `state` |
| 39 | `WorkspaceManager` | function_declaration | yes | no | `` |
| 49 | `handler` | arrow_function | no | no | `e` |
| 58 | `handler` | arrow_function | no | no | `` |
| 67 | `handler` | arrow_function | no | no | `e` |

## packages/web/src/dhf/built-in-templates.ts

- Symbols: 5
- Exported symbols: 3

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 31 | `stripFrontmatter` | function_declaration | no | no | `md` |
| 39 | `resolveIncludes` | function_declaration | no | no | `content` |
| 57 | `getBuiltInTemplate` | function_declaration | yes | no | `templateId` |
| 64 | `listBuiltInTemplateIds` | function_declaration | yes | no | `` |
| 69 | `hasBuiltInTemplate` | function_declaration | yes | no | `templateId` |

## packages/web/src/router.ts

- Symbols: 5
- Exported symbols: 5

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 20 | `kindToFamily` | function_declaration | yes | no | `kind` |
| 25 | `elementUrl` | function_declaration | yes | no | `shortId` |
| 31 | `familyUrl` | function_declaration | yes | no | `family` |
| 36 | `diagramUrl` | function_declaration | yes | no | `diagramType, diagramId` |
| 43 | `diagramTypeUrl` | function_declaration | yes | no | `diagramType` |

## packages/web/src/short-id.ts

- Symbols: 3
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 26 | `abbreviateWord` | function_declaration | no | no | `word` |
| 31 | `kindToPrefix` | function_declaration | yes | no | `kind` |
| 37 | `prefixToFamily` | function_declaration | yes | no | `prefix` |

## packages/web/src/store/model-store.ts

- Symbols: 14
- Exported symbols: 12

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 22 | `loadUserViewpoints` | function_declaration | no | no | `` |
| 31 | `saveUserViewpoints` | function_declaration | no | no | `viewpoints` |
| 851 | `getElements` | function_declaration | yes | no | `model` |
| 856 | `getElementsByLayer` | function_declaration | yes | no | `model` |
| 866 | `getElementsByKind` | function_declaration | yes | no | `model` |
| 876 | `getRelationshipsForElement` | function_declaration | yes | no | `model, elementId` |
| 887 | `getAllAttributeKeys` | function_declaration | yes | no | `model` |
| 899 | `getAllLabels` | function_declaration | yes | no | `model` |
| 914 | `getElementTags` | function_declaration | yes | no | `el` |
| 920 | `getElementGroup` | function_declaration | yes | no | `el` |
| 925 | `getGroupsForKind` | function_declaration | yes | no | `model, kind` |
| 938 | `getAllTags` | function_declaration | yes | no | `model` |
| 948 | `getDiagram` | function_declaration | yes | no | `model, diagramId` |
| 954 | `getDiagramsForViewpoint` | function_declaration | yes | no | `model, viewpointId` |

## packages/web/src/store/workspace-store.ts

- Symbols: 5
- Exported symbols: 0

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 57 | `generateId` | function_declaration | no | no | `` |
| 61 | `persistToStorage` | function_declaration | no | no | `sets` |
| 69 | `loadFromLocalStorage` | function_declaration | no | no | `` |
| 79 | `loadQuickSlots` | function_declaration | no | no | `` |
| 89 | `persistQuickSlots` | function_declaration | no | no | `slots` |

## packages/web/src/store/ws-client.ts

- Symbols: 21
- Exported symbols: 20

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 34 | `loadEmbeddedData` | function_declaration | yes | no | `` |
| 46 | `connectWebSocket` | function_declaration | yes | no | `url` |
| 91 | `handleMessage` | function_declaration | no | no | `msg` |
| 170 | `requestRefresh` | function_declaration | yes | no | `` |
| 177 | `sendElementUpdate` | function_declaration | yes | no | `element` |
| 187 | `sendElementCreate` | function_declaration | yes | no | `element` |
| 197 | `sendAddRelationship` | function_declaration | yes | no | `sourceId, targetId, relType` |
| 207 | `sendDiagramCreate` | function_declaration | yes | no | `payload` |
| 214 | `sendDiagramUpdate` | function_declaration | yes | no | `payload` |
| 221 | `sendDiagramDelete` | function_declaration | yes | no | `id` |
| 229 | `sendDiagramParse` | function_declaration | yes | no | `diagramId, text` |
| 237 | `sendKindRemap` | function_declaration | yes | no | `mappings` |
| 244 | `sendOntologySelection` | function_declaration | yes | no | `selected` |
| 251 | `sendOntologyInstall` | function_declaration | yes | no | `source` |
| 258 | `sendOntologyRemove` | function_declaration | yes | no | `packageName` |
| 265 | `sendDiagramLayoutUpdate` | function_declaration | yes | no | `diagramId, layout` |
| 272 | `sendCsvImport` | function_declaration | yes | no | `payload` |
| 279 | `sendLlmAsk` | function_declaration | yes | no | `requestId, question` |
| 286 | `sendLlmGenerate` | function_declaration | yes | no | `requestId, description` |
| 293 | `sendLlmDraft` | function_declaration | yes | no | `requestId, documentTypeId, targetSections` |
| 300 | `sendLlmSuggest` | function_declaration | yes | no | `requestId` |

## packages/web/src/views/ActionFlowDiagram.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 28 | `ActionFlowDiagramInner` | function_declaration | no | no | `` |
| 199 | `ActionFlowDiagram` | function_declaration | yes | no | `` |

## packages/web/src/views/ActionFlowNode.tsx

- Symbols: 1
- Exported symbols: 0

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 28 | `ActionFlowNodeInner` | function_declaration | no | no | `{ data }` |

## packages/web/src/views/AskPanel.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 25 | `AskPanel` | function_declaration | yes | no | `` |
| 66 | `handleKeyDown` | arrow_function | no | no | `e` |
| 233 | `LoadingDots` | function_declaration | no | no | `` |

## packages/web/src/views/CatalogExplorer.tsx

- Symbols: 24
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 23 | `CatalogExplorer` | function_declaration | yes | no | `` |
| 57 | `markDirty` | arrow_function | no | no | `elementId, field, value` |
| 66 | `isDirty` | arrow_function | no | no | `elementId, field` |
| 72 | `getDirtyValue` | arrow_function | no | no | `elementId, field` |
| 76 | `saveAll` | arrow_function | no | no | `` |
| 99 | `discardAll` | arrow_function | no | no | `` |
| 237 | `isExpanded` | arrow_function | no | no | `id` |
| 238 | `toggleExpand` | arrow_function | no | no | `id` |
| 241 | `expandAll` | arrow_function | no | no | `` |
| 243 | `walk` | arrow_function | no | no | `nodes` |
| 247 | `collapseAll` | arrow_function | no | no | `` |
| 319 | `fieldValue` | arrow_function | no | no | `field` |
| 327 | `startEdit` | arrow_function | no | no | `field` |
| 332 | `commitEdit` | arrow_function | no | no | `` |
| 338 | `cancelEdit` | arrow_function | no | no | `` |
| 341 | `handleAddRelationship` | arrow_function | no | no | `` |
| 348 | `addDiscussionComment` | arrow_function | no | no | `` |
| 376 | `getElementStatus` | arrow_function | no | no | `elementId` |
| 381 | `getFolderStatus` | arrow_function | no | no | `node` |
| 398 | `renderFolder` | arrow_function | no | no | `node` |
| 464 | `renderLeaf` | arrow_function | no | no | `node` |
| 510 | `EditableField` | arrow_function | no | no | `{ field, label, placeholder, multiline }` |
| 562 | `RelGraphPopup` | arrow_function | no | no | `` |
| 633 | `ImpactModal` | arrow_function | no | no | `` |

## packages/web/src/views/CatalogHomePage.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 15 | `CatalogHomePage` | function_declaration | yes | no | `` |
| 76 | `FamilyCard` | function_declaration | no | no | `{ family, count, kinds, color, onClick }` |

## packages/web/src/views/CompletenessHints.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 21 | `CompletenessHints` | function_declaration | yes | no | `` |

## packages/web/src/views/ComplianceWizard.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 60 | `checkISO14971` | function_declaration | no | no | `model` |
| 118 | `checkIEC62304` | function_declaration | no | no | `model` |
| 165 | `ComplianceWizard` | function_declaration | yes | no | `` |

## packages/web/src/views/DSMView.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 15 | `cellColor` | function_declaration | no | no | `cell` |
| 24 | `cellBg` | function_declaration | no | no | `cell` |
| 33 | `DSMView` | function_declaration | yes | no | `` |

## packages/web/src/views/Dashboard.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 44 | `computeDashboardStats` | function_declaration | no | no | `model, violations, completenessPercent` |
| 89 | `computeNextAction` | function_declaration | no | no | `stats` |
| 156 | `StatCard` | function_declaration | no | no | `{ label, value, color, subtitle }` |
| 169 | `CoverageTile` | function_declaration | no | no | `{ layer, label, count, color, onClick }` |
| 219 | `QuickActionButton` | function_declaration | no | no | `{ icon, label, onClick, variant = 'secondary' }` |
| 252 | `Dashboard` | function_declaration | yes | no | `` |

## packages/web/src/views/DecompositionNode.tsx

- Symbols: 1
- Exported symbols: 0

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 28 | `DecompositionNodeInner` | function_declaration | no | no | `{ data }` |

## packages/web/src/views/DhfDashboard.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 69 | `computeDocStatus` | function_declaration | no | no | `doc, model, validation` |
| 95 | `DhfDashboard` | function_declaration | yes | no | `` |
| 216 | `MetricCard` | function_declaration | no | no | `{ label, value, color }` |
| 228 | `FilterPill` | function_declaration | no | no | `{ label, active, onClick, color }` |
| 244 | `DocCard` | function_declaration | no | no | `{ doc, status, onClick }` |
| 295 | `DrilldownView` | function_declaration | no | no | `{ doc, status, model, validation, onBack }` |

## packages/web/src/views/DhfSettingsPanel.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 72 | `DhfSettingsPanel` | function_declaration | yes | no | `{ onClose }` |
| 80 | `set` | function_declaration | no | no | `key, value` |
| 84 | `handleSave` | function_declaration | no | no | `` |

## packages/web/src/views/DhfWorkbench.tsx

- Symbols: 10
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 87 | `DhfWorkbench` | function_declaration | yes | no | `` |
| 352 | `DocPropertiesBar` | function_declaration | no | no | `{ doc, onUpdate }` |
| 402 | `SnippetCard` | function_declaration | no | no | `{ snippet, onInsert }` |
| 428 | `GearIcon` | function_declaration | no | no | `{ size }` |
| 439 | `MarkdownPreview` | function_declaration | no | no | `{ content, model, settings, doc }` |
| 458 | `renderPersonTable` | function_declaration | no | no | `raw, role` |
| 474 | `renderApprovalBlock` | function_declaration | no | no | `doc` |
| 506 | `renderMarkdown` | function_declaration | no | no | `md, model, settings, doc` |
| 556 | `get` | arrow_function | no | no | `prefix` |
| 640 | `escapeHtml` | function_declaration | no | no | `s` |

## packages/web/src/views/DiagramCanvas.tsx

- Symbols: 7
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 88 | `QuickCreatePopup` | function_declaration | no | no | `{ x, y, onConfirm, onCancel }` |
| 95 | `h` | arrow_function | no | no | `e` |
| 161 | `DiagramCanvasInner` | function_declaration | no | no | `` |
| 266 | `clearDescendants` | arrow_function | no | no | `id` |
| 284 | `collectAll` | arrow_function | no | no | `id` |
| 502 | `handler` | arrow_function | no | no | `e` |
| 1159 | `DiagramCanvas` | function_declaration | yes | no | `` |

## packages/web/src/views/DiagramContextMenus.tsx

- Symbols: 7
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 18 | `MenuItem` | function_declaration | no | no | `{ label, icon, danger, onClick }` |
| 33 | `MenuDivider` | function_declaration | no | no | `` |
| 37 | `Menu` | function_declaration | no | no | `{ x, y, onClose, children }` |
| 43 | `handler` | arrow_function | no | no | `e` |
| 46 | `esc` | arrow_function | no | no | `e` |
| 108 | `NodeContextMenu` | function_declaration | yes | no | `{
    x, y, nodeId, nodeKind, onClose,
    onEditName, onChangeColor, onRemoveFromDiagram, onDeleteFromModel,
    onLinkRisk, onLinkRequirement,
    onShowProperties, onFocusElement, onShowInCatalog, onShowRelMatrix, onOpenSource,
    onViewKindInOntology,
}` |
| 235 | `EdgeContextMenu` | function_declaration | yes | no | `{
    x, y, edgeId, relType, onClose,
    onChangeStyle, onChangeColor, onToggleLabel, onDelete,
}` |

## packages/web/src/views/DiagramEditor.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 23 | `serializeDiagramToSysML` | function_declaration | no | no | `diagram, elements` |
| 40 | `ElementMembershipPanel` | function_declaration | no | no | `{ diagram }` |
| 127 | `DiagramEditor` | function_declaration | yes | no | `{ diagramId }` |

## packages/web/src/views/DiagramPalette.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 32 | `DiagramPalette` | function_declaration | yes | no | `{ collapsed, onToggleCollapse, eligibleKinds }` |
| 95 | `toggleLayer` | arrow_function | no | no | `layer` |
| 104 | `onDragStart` | arrow_function | no | no | `e, item` |

## packages/web/src/views/ElementCollectionPage.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 19 | `ElementCollectionPage` | function_declaration | yes | no | `{ family }` |
| 159 | `ElementRow` | function_declaration | no | no | `{ element, zebra, onClick }` |
| 203 | `CollectionShell` | function_declaration | no | no | `{ family, children }` |

## packages/web/src/views/ElementDetailView.tsx

- Symbols: 8
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 12 | `parseSteps` | function_declaration | no | no | `doc` |
| 23 | `ScenarioFlowchart` | function_declaration | no | no | `{ element, layerColor }` |
| 45 | `handleSave` | arrow_function | no | no | `` |
| 140 | `ElementDetailView` | function_declaration | yes | no | `` |
| 188 | `handleSave` | arrow_function | no | no | `` |
| 194 | `resolveElementName` | arrow_function | no | no | `id` |
| 497 | `Section` | function_declaration | no | no | `{ title, children }` |
| 511 | `RelationshipRow` | function_declaration | no | no | `{ rel, direction, resolveName, onNavigate }` |

## packages/web/src/views/ExtensionBrowser.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 14 | `ExtensionBrowser` | function_declaration | yes | no | `` |

## packages/web/src/views/ModelDiff.tsx

- Symbols: 3
- Exported symbols: 2

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 17 | `computeModelDiff` | function_declaration | yes | no | `before, after` |
| 73 | `ModelDiff` | function_declaration | yes | no | `` |
| 321 | `DiffRow` | function_declaration | no | no | `{ element, type, onClick }` |

## packages/web/src/views/OntologyViewer.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 29 | `OntologyViewer` | function_declaration | yes | no | `` |

## packages/web/src/views/RelationshipPicker.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 38 | `RelationshipPicker` | function_declaration | yes | no | `{
    x, y, sourceKind, targetKind, closureRules, onSelect, onCancel,
}` |
| 52 | `handler` | arrow_function | no | no | `e` |
| 61 | `handler` | arrow_function | no | no | `e` |

## packages/web/src/views/ReviewDashboard.tsx

- Symbols: 9
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 14 | `ArchitectureSection` | function_declaration | no | no | `{ model }` |
| 121 | `RequirementsSection` | function_declaration | no | no | `{ model }` |
| 180 | `RiskSection` | function_declaration | no | no | `{ model }` |
| 235 | `VerificationSection` | function_declaration | no | no | `{ model }` |
| 298 | `SectionHeader` | function_declaration | no | no | `{ icon, title, badge, onExpand, badgeColor }` |
| 324 | `CoverageBar` | function_declaration | no | no | `{ label, percent, count, total, color, warningThreshold = 100 }` |
| 346 | `MetricPill` | function_declaration | no | no | `{ label, value, alert }` |
| 355 | `EmptyHint` | function_declaration | no | no | `{ text }` |
| 384 | `ReviewDashboard` | function_declaration | yes | no | `` |

## packages/web/src/views/ScenarioCatalog.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 6 | `ScenarioCatalog` | function_declaration | yes | no | `` |
| 42 | `toggleGroup` | arrow_function | no | no | `g` |

## packages/web/src/views/ScenarioEditor.tsx

- Symbols: 4
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 16 | `parseSteps` | function_declaration | no | no | `doc` |
| 25 | `serializeSteps` | function_declaration | no | no | `steps` |
| 31 | `ScenarioEditor` | function_declaration | yes | no | `` |
| 124 | `toggleGroup` | arrow_function | no | no | `g` |

## packages/web/src/views/StatisticsDashboard.tsx

- Symbols: 4
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 34 | `computeStats` | function_declaration | no | no | `model` |
| 124 | `StatisticsDashboard` | function_declaration | yes | no | `` |
| 302 | `StatCard` | function_declaration | no | no | `{ label, value, color }` |
| 311 | `MetricCard` | function_declaration | no | no | `{ label, value, unit, status }` |

## packages/web/src/views/SysmlGenerator.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 24 | `SysmlGenerator` | function_declaration | yes | no | `` |
| 58 | `handleCopy` | arrow_function | no | no | `` |

## packages/web/src/views/TabularView.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 14 | `StatusDot` | function_declaration | no | no | `{ element }` |
| 31 | `SortIcon` | function_declaration | no | no | `{ col, sortKey, sortDir }` |
| 38 | `TabularView` | function_declaration | yes | no | `` |
| 119 | `score` | arrow_function | no | no | `el` |
| 137 | `handleSort` | function_declaration | no | no | `key` |
| 155 | `Th` | arrow_function | no | no | `{ col, label, width }` |

## packages/web/src/views/TraceabilityMatrix.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 66 | `MatrixCell` | function_declaration | no | no | `{ cell, onClick }` |
| 90 | `TraceabilityMatrix` | function_declaration | yes | no | `` |

## packages/web/src/views/WorkflowWizard.tsx

- Symbols: 5
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 140 | `StepCard` | function_declaration | no | no | `{
    step,
    index,
    isActive,
    model,
    onSelect,
    onAction,
}` |
| 227 | `DetailPanel` | function_declaration | no | no | `{ step, model, onAction }` |
| 287 | `OverallProgress` | function_declaration | no | no | `{ model }` |
| 310 | `WorkflowWizard` | function_declaration | yes | no | `` |
| 334 | `handleAction` | function_declaration | no | no | `view` |

## packages/web/src/views/layout.ts

- Symbols: 19
- Exported symbols: 9

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 26 | `computeLayout` | function_declaration | yes | yes | `model, options` |
| 51 | `nodeWidth` | arrow_function | no | no | `el` |
| 163 | `buildDecompositionTree` | function_declaration | yes | no | `model` |
| 201 | `buildElkCompoundGraph` | function_declaration | no | no | `nodeId, tree, depth, maxDepth` |
| 231 | `computeIBDLayout` | function_declaration | yes | yes | `model, options` |
| 262 | `flattenNodes` | function_declaration | no | no | `elkNode, parentId` |
| 323 | `computeTreeLayout` | function_declaration | yes | yes | `model, options` |
| 336 | `collectIds` | function_declaration | no | no | `id` |
| 442 | `computeDecompositionLayout` | function_declaration | yes | yes | `model, options` |
| 459 | `collectVisible` | function_declaration | no | no | `id` |
| 540 | `computeContainmentLayout` | function_declaration | yes | no | `model, options` |
| 552 | `computeContainment` | function_declaration | no | no | `nodeId, parentId, depth, offsetX, offsetY` |
| 619 | `removeDescendantNodes` | function_declaration | no | no | `nodeId` |
| 621 | `collect` | arrow_function | no | no | `id` |
| 662 | `buildFunctionalTree` | function_declaration | yes | no | `model` |
| 693 | `computeFBSLayout` | function_declaration | yes | yes | `model, options` |
| 710 | `collectVisible` | function_declaration | no | no | `id` |
| 804 | `computeActionFlowLayout` | function_declaration | yes | yes | `model` |
| 1082 | `findActionDefId` | function_declaration | no | no | `usage, model` |

## packages/web/src/views/ontology/KindMappingDialog.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 16 | `KindMappingDialog` | function_declaration | yes | no | `{ kindsToRemap, onConfirm, onCancel }` |
| 31 | `setMapping` | function_declaration | no | no | `kind, target` |

## packages/web/src/views/ontology/KindPropertiesPanel.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 15 | `KindPropertiesPanel` | function_declaration | yes | no | `{ kind, layers, onKindClick, onClose, allOntologies, onNavigate }` |
| 22 | `resolveKindPackage` | function_declaration | no | no | `name` |
| 30 | `handleKindLinkClick` | function_declaration | no | no | `name` |
| 160 | `Section` | function_declaration | no | no | `{ title, children }` |
| 171 | `KindLink` | function_declaration | no | no | `{ name, layer, crossOntology, onClick }` |
| 189 | `StatCard` | function_declaration | no | no | `{ label, value }` |

## packages/web/src/views/ontology/LayerGrid.tsx

- Symbols: 8
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 95 | `sortByLifecycle` | function_declaration | no | no | `layers` |
| 100 | `sortKindsParentFirst` | function_declaration | no | no | `kinds` |
| 136 | `KindCard` | function_declaration | no | no | `{ kind, layerColor, domainBg, selected, onClick, onContextMenu, isFlashing, flashTick }` |
| 237 | `LayerGrid` | function_declaration | yes | no | `{ layers, selectedKind, onKindClick, activeLayerId, flashKindName, flashTick }` |
| 271 | `handleContextMenu` | function_declaration | no | no | `e, _kindName` |
| 275 | `toggleSwimlane` | function_declaration | no | no | `groupId` |
| 283 | `renderCards` | arrow_function | no | no | `kindList, layerColor, domainBg` |
| 300 | `renderSwimlane` | arrow_function | no | no | `group, groupLayers` |

## packages/web/src/views/ontology/LayerTable.tsx

- Symbols: 4
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 21 | `LayerTable` | function_declaration | yes | no | `{ layers, selectedKind, onKindClick }` |
| 90 | `handleSort` | function_declaration | no | no | `key` |
| 115 | `SortIcon` | arrow_function | no | no | `{ k }` |
| 121 | `renderKindRow` | arrow_function | no | no | `kind, i` |

## packages/web/src/views/ontology/OntologyDecompositionDiagram.tsx

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 32 | `layoutPackages` | function_declaration | no | no | `packages` |
| 154 | `OntologyDecompositionDiagram` | function_declaration | yes | no | `` |

## packages/web/src/views/ontology/OntologyDetailPanel.tsx

- Symbols: 8
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 77 | `ZoomPanCanvas` | function_declaration | no | no | `{ children }` |
| 84 | `clampZoom` | arrow_function | no | no | `z` |
| 117 | `fitToView` | function_declaration | no | no | `` |
| 178 | `CanvasToolbarBtn` | function_declaration | no | no | `{ onClick, title, children }` |
| 205 | `OntologyDetailPanel` | function_declaration | yes | no | `{ ontology, onBack }` |
| 272 | `handleCrossOntologyNavigate` | function_declaration | no | no | `packageName, kindName` |
| 279 | `handleLayerBreadcrumbClick` | function_declaration | no | no | `layerId` |
| 444 | `LayerFallback` | function_declaration | no | no | `{ layers }` |

## packages/web/src/views/ontology/OntologyHome.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 13 | `OntologyHome` | function_declaration | yes | no | `{ ontology }` |

## packages/web/src/views/ontology/OntologyLibraryPanel.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 16 | `OntologyLibraryPanel` | function_declaration | yes | no | `{ onClose }` |
| 24 | `handleInstall` | function_declaration | no | no | `` |
| 31 | `handleRemove` | function_declaration | no | no | `packageName` |

## packages/web/src/views/ontology/OntologyPackageNode.tsx

- Symbols: 1
- Exported symbols: 0

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 29 | `OntologyPackageNodeInner` | function_declaration | no | no | `{ data }` |

## packages/web/src/views/ontology/OntologySelectionPanel.tsx

- Symbols: 5
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 13 | `OntologySelectionPanel` | function_declaration | yes | no | `` |
| 28 | `handleSave` | function_declaration | no | no | `` |
| 37 | `handleOrphanKeep` | function_declaration | no | no | `` |
| 42 | `handleOrphanRemap` | function_declaration | no | no | `_mappings` |
| 163 | `PackageRow` | function_declaration | no | no | `{ pkg, checked, focused, onToggle, onFocus }` |

## packages/web/src/views/ontology/OntologyViewer.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 20 | `OntologyViewer` | function_declaration | yes | no | `` |

## packages/web/src/views/ontology/OrphanWarningDialog.tsx

- Symbols: 1
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 22 | `OrphanWarningDialog` | function_declaration | yes | no | `{ orphans, onKeep, onRemap, onCancel }` |

## packages/web/src/views/ontology/RelationshipOverlay.tsx

- Symbols: 6
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 26 | `ensureMarkerDefs` | function_declaration | no | no | `` |
| 86 | `measureEdges` | function_declaration | no | no | `containerEl, relTypes, activeTypes` |
| 142 | `edgePath` | function_declaration | no | no | `e` |
| 152 | `EdgeElement` | function_declaration | no | no | `{ edge, dim }` |
| 231 | `RelationshipOverlay` | function_declaration | yes | no | `{ containerRef, ontology, activeTypes }` |
| 241 | `doMeasure` | arrow_function | no | no | `` |

## packages/web/src/views/ontology/RelationshipsSection.tsx

- Symbols: 7
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 30 | `NotationBadge` | function_declaration | no | no | `{ style }` |
| 81 | `TypeChip` | function_declaration | no | no | `{
    name,
    active,
    onClick,
}` |
| 126 | `DomainGroupRow` | function_declaration | no | no | `{
    group,
    presentTypes,
    activeTypes,
    onToggleType,
    onToggleGroup,
}` |
| 210 | `RelationshipsSection` | function_declaration | yes | no | `{ ontology, activeTypes, onActiveTypesChange }` |
| 223 | `toggleType` | function_declaration | no | no | `name` |
| 229 | `toggleGroup` | function_declaration | no | no | `names` |
| 240 | `clearAll` | function_declaration | no | no | `` |

## packages/web/src/views/ontology/SysMLMappingTable.tsx

- Symbols: 3
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 74 | `SysMLMappingTable` | function_declaration | yes | no | `{ layers }` |
| 146 | `ConstructSection` | function_declaration | no | no | `{ group }` |
| 211 | `KindChip` | function_declaration | no | no | `{ kind }` |

## packages/web/src/views/ontology/sysml-edge-styles.ts

- Symbols: 2
- Exported symbols: 1

| Line | Function symbol | Kind | Exported | Async | Parameters |
|---:|---|---|---|---|---|
| 58 | `e` | function_declaration | no | no | `domain, category, lineStyle, sourceMarker, targetMarker, color, stereotype` |
| 185 | `getEdgeStyle` | function_declaration | yes | no | `name` |

