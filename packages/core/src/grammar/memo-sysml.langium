// =============================================================================
// MEMO SysML v2 Grammar — Langium definition
//
// Covers the SysML v2 subset needed for MEMO medical device modeling:
//   package, part def, requirement def, action def, port def, interface def,
//   connection def, attribute def, enum def, viewpoint def, view def,
//   import, specialization (:>), typed connections, doc comments
//
// Design notes:
//   - DOC_COMMENT is a non-hidden terminal that captures `doc /* ... */`
//     as a single token, preventing the hidden ML_COMMENT from consuming it
//   - FeatureName allows 'part' keyword as identifier in end/connection contexts
//     (SysML v2 uses `end part[0..*]` in connection defs)
//   - QualifiedName is a data type rule returning string; cross-references
//     are resolved programmatically in the semantic model layer
// =============================================================================

grammar MemoSysML

// ─── Entry point ─────────────────────────────────────────────────────────────

entry Model:
    members+=NamespaceMember*;

NamespaceMember:
    PackageDeclaration | ImportDeclaration;

// ─── Package ─────────────────────────────────────────────────────────────────

PackageDeclaration:
    'package' name=QualifiedName '{'
        members+=PackageMember*
    '}';

PackageMember:
    PackageDeclaration
    | ImportDeclaration
    | DefinitionMember
    | UsageMember
    | ConnectionUsage
    | DocComment;

// ─── Import ──────────────────────────────────────────────────────────────────

ImportDeclaration:
    'import' path=ImportPath ';';

// Separate rule to handle wildcard imports (e.g. `import MEMO_Ontology::*`)
// without LL parser ambiguity on `::` lookahead in QualifiedName
ImportPath returns string:
    ID ('::' (ID | '*'))*;

// ─── Definitions ─────────────────────────────────────────────────────────────

DefinitionMember:
    PartDefinition
    | RequirementDefinition
    | ActionDefinition
    | PortDefinition
    | InterfaceDefinition
    | ConnectionDefinition
    | AttributeDefinition
    | EnumDefinition
    | ViewpointDefinition
    | ViewDefinition;

PartDefinition:
    'part' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

RequirementDefinition:
    'requirement' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

ActionDefinition:
    'action' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

PortDefinition:
    'port' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

InterfaceDefinition:
    'interface' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

ConnectionDefinition:
    'connection' 'def' name=ID specialization=Specialization?
    ('{' body+=ConnectionBodyMember* '}' | ';');

AttributeDefinition:
    'attribute' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

EnumDefinition:
    'enum' 'def' name=ID '{'
        literals+=EnumLiteral*
    '}';

ViewpointDefinition:
    'viewpoint' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

ViewDefinition:
    'view' 'def' name=ID specialization=Specialization?
    ('{' body+=DefinitionBodyMember* '}' | ';');

// ─── Connection definition body ─────────────────────────────────────────────

ConnectionBodyMember:
    EndDeclaration | DefinitionBodyMember;

EndDeclaration:
    'end' name=FeatureName (':' type=QualifiedName)? multiplicity=Multiplicity? ';';

Multiplicity:
    '[' lower=INT '..' (upper=INT | unbounded?='*') ']'
    | '[' exact=INT ']';

// ─── Enum literal ────────────────────────────────────────────────────────────

EnumLiteral:
    'enum' name=ID ';';

// ─── Usages (instances) ─────────────────────────────────────────────────────

UsageMember:
    PartUsage
    | RequirementUsage
    | ActionUsage
    | PortUsage;

PartUsage:
    'part' name=ID ':' type=QualifiedName
    ('{' body+=UsageBodyMember* '}' | ';');

RequirementUsage:
    'requirement' name=ID ':' type=QualifiedName
    ('{' body+=UsageBodyMember* '}' | ';');

ActionUsage:
    'action' name=ID ':' type=QualifiedName
    ('{' body+=UsageBodyMember* '}' | ';');

PortUsage:
    'port' name=ID ':' type=QualifiedName
    ('{' body+=UsageBodyMember* '}' | ';');

// ─── Connection usage (typed relationship instances) ─────────────────────────
// Syntax: connection : Type connect end1 ::> ref1 to end2 ::> ref2 ;

ConnectionUsage:
    'connection' (':' type=QualifiedName)?
    'connect' source=ConnectionEnd 'to' target=ConnectionEnd ';';

ConnectionEnd:
    endName=FeatureName '::>' ref=QualifiedName;

// ─── Body members ────────────────────────────────────────────────────────────

DefinitionBodyMember:
    AttributeMember | PartMember | DocComment;

UsageBodyMember:
    AttributeMember | DocComment;

// ─── Attribute member ────────────────────────────────────────────────────────
// Two forms:
//   attribute name : Type ;              (type declaration)
//   attribute redefines name = value ;   (value assignment / redefinition)

AttributeMember:
    'attribute' redefines?='redefines'? name=ID
    (':' type=QualifiedName ';' | '=' value=AttributeValue ';');

AttributeValue:
    StringValue | IntValue | BooleanValue | EnumValue;

StringValue:
    value=STRING;

IntValue:
    value=INT;

BooleanValue:
    value=('true' | 'false');

// Enum literal reference: e.g. SeverityLevel::Catastrophic
EnumValue:
    enumRef=QualifiedName;

// ─── Nested part member ──────────────────────────────────────────────────────
// e.g. part subsystems : Subsystem[0..*];

PartMember:
    'part' name=ID (':' type=QualifiedName)? multiplicity=Multiplicity? ';';

// ─── Doc comment ─────────────────────────────────────────────────────────────
// Captured as a single terminal to prevent hidden ML_COMMENT from consuming it

DocComment:
    content=DOC_COMMENT;

// ─── Specialization ──────────────────────────────────────────────────────────

Specialization:
    ':>' superType=QualifiedName;

// ─── Qualified name (data type rule → returns string) ────────────────────────

QualifiedName returns string:
    ID ('::' ID)*;

// Allow keywords that are also valid SysML v2 identifiers in specific contexts
// (e.g. `end part[0..*]` in connection defs, `connect control ::> ref`)
FeatureName returns string:
    ID | 'part';

// ─── Hidden terminals (skipped by lexer) ─────────────────────────────────────

hidden terminal WS: /\s+/;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;

// ─── Visible terminals ──────────────────────────────────────────────────────

// DOC_COMMENT captures `doc /* ... */` as a single token.
// The `doc\s+` prefix ensures it only matches when preceded by the `doc` keyword,
// preventing conflict with ML_COMMENT for standalone /* ... */ comments.
terminal DOC_COMMENT: /doc\s+\/\*[\s\S]*?\*\//;

terminal ID: /[a-zA-Z_][a-zA-Z0-9_]*/;
terminal STRING: /"(?:[^"\\]|\\.)*"/;
terminal INT: /[0-9]+/;
