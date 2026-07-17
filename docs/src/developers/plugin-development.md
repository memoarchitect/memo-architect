# Plugin Development Guide

The MEMO plugin system allows you to extend the core platform with custom validation rules, analysis tools, and document exporters.

## 1. Overview

Plugins in MEMO are designed to be decoupled from the core logic, allowing for easy sharing and independent evolution. A plugin consists of:
- **`memo.plugin.yaml`**: The manifest file defining the plugin's name, version, and entry points.
- **Source Code**: JavaScript/TypeScript files implementing the plugin interface.

## 2. Plugin Types

| Type | Description | Interface |
|---|---|---|
| **Exporter** | Custom document rendering (e.g., CSV, LaTeX). | `ExporterPlugin` |
| **Analysis** | Custom model checks (e.g., MTBF calculation). | `AnalysisPlugin` |
| **Generator** | Automated SysML creation (e.g., boilerplate). | `GeneratorPlugin` |

## 3. Creating a Plugin

Use the CLI to scaffold a new plugin project:

```bash
memo plugin create my-custom-exporter
```

This will create a new directory with the following structure:
```text
my-custom-exporter/
  ├── memo.plugin.yaml
  ├── package.json
  └── src/
      └── index.ts
```

### Manifest Example (`memo.plugin.yaml`)
```yaml
id: "acme-mtbf-viz"
name: "MTBF Visualizer"
version: "1.0.0"
type: "analysis"
entry: "./dist/index.js"
configSchema:
  threshold: "number"
```

## 4. Implementation Example

An Analysis plugin must implement a `run()` method that receives the `MemoModel`:

```typescript
import { MemoModel, AnalysisResult } from '@memoarchitect/tools';

export default {
  async run(model: MemoModel, config: any): Promise<AnalysisResult> {
    const components = Array.from(model.elements.values()).filter(e => e.kind === 'Component');
    
    // Custom logic to calculate metrics
    const results = components.map(c => ({
       id: c.id,
       metric: calculateMTBF(c)
    }));
    
    return {
      success: true,
      data: results
    };
  }
}
```

## 5. Running Plugins

Once installed, you can list and execute plugins via the CLI:

```bash
# List all installed plugins
memo plugin list

# Run a specific plugin against your current project
memo plugin run acme-mtbf-viz
```

## 6. Distribution

Plugins can be shared as npm packages or git subtrees. To install a plugin:
```bash
memo install https://github.com/acme/memo-plugin-mtbf.git
```
