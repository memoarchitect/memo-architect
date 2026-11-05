# Write your own extension

Write an extension when your domain or technology needs kinds the base does not
have—an insulin-pump accessory family, a proprietary fieldbus, a laboratory
instrument class—and you want every project in your organization to model them
the same way.

## The rules

1. **Specialize; never restate.** Every definition specializes a base
   definition. Do not redefine what the base already expresses.
2. **Prefix every definition.** Definition names start with the PascalCase form
   of the extension's directory name (`fieldbus/` → `FieldbusNode`). Definition
   names share one namespace with the base and every other extension; the prefix
   makes collisions impossible. Enumeration literals are not prefixed.
3. **Use native mechanisms first.** Use ports, interfaces, flows, items,
   allocations and dependencies before inventing a relationship. If you do need
   one, specialize a base relation: `connection def FieldbusLink :> MemoRelationship`,
   never a free-standing `connection def`. Give it a
   `metadata def … :> SemanticMetadata` keyword as the base relations have.
4. **Ship a facade.** One package, `memo_extension_<directory>`, publicly
   imports every other package the extension ships and every extension it builds
   on. The facade *is* the extension: projects import it, and nothing else
   identifies it.
5. **Keep the descriptor small.** `memo.package.yaml` carries identity and
   `sysmlDir` only. Semantic fields (`type`, `extends`, `usage`, `ontologies`,
   `methodology`, `modules`) are rejected.

## Layout

```text
fieldbus/
  memo.package.yaml            name, version, sysmlDir: ./model
  model/
    fieldbus_extension.sysml   the facade
    memo_fieldbus.sysml        the definitions
```

```sysml
// fieldbus_extension.sysml
package memo_extension_fieldbus {
    public import memo_extension_fieldbus_core::*;
}

// memo_fieldbus.sysml
package memo_extension_fieldbus_core {
    private import memo_architecture_logical_interfaces::*;
    private import memo_architecture_implementation_software_runtime::*;

    port def FieldbusPort specializes SoftwarePort {
        attribute nodeAddress : ScalarValues::Integer;
    }
    part def FieldbusNode specializes SoftwareComponent {
        attribute cycleTimeMs : ScalarValues::Real;
    }
}
```

Start from the `template/` extension in the ontology package, which has this
shape already. To use the extension in a project, add it with
`memo-architect install <path or git URL>` and publicly import its facade from
the project's method-binding package, as for any [shipped extension](index.md).

## Check it

- `memo validate .` in a project that imports the extension reports unresolved
  names and rule violations.
- Kinds you add appear in the Model Explorer, the type picker and
  **Ontology Explorer** (an experimental page) once Architect restarts.
- `memo-architect new kind <Name>` writes a single new kind definition into a
  project's local ontology folder, when a whole extension is more than you need.
