import { describe, it, expect, beforeAll } from 'vitest';
import { type LangiumDocument, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type {
    Model,
    PackageDeclaration,
    PartDefinition,
    RequirementDefinition,
    ActionDefinition,
    ConnectionDefinition,
    EnumDefinition,
    PortDefinition,
    InterfaceDefinition,
    AttributeDefinition,
    ViewDefinition,
    PartUsage,
    RequirementUsage,
    ActionUsage,
    ConnectionUsage,
    AttributeMember,
    EndDeclaration,
    DocComment,
    StringValue,
    IntValue,
    BooleanValue,
    EnumValue,
} from '../language/generated/ast.js';

const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
const parse = parseHelper<Model>(services);

/** Helper: parse and assert no errors */
async function parseValid(input: string): Promise<Model> {
    const doc: LangiumDocument<Model> = await parse(input);
    const errors = doc.parseResult.lexerErrors
        .concat(doc.parseResult.parserErrors as any[]);
    if (errors.length > 0) {
        throw new Error(
            `Parse errors:\n${errors.map((e: any) => e.message).join('\n')}\n\nInput:\n${input}`
        );
    }
    return doc.parseResult.value;
}

async function parseErrors(input: string): Promise<string[]> {
    const doc: LangiumDocument<Model> = await parse(input);
    return doc.parseResult.lexerErrors
        .concat(doc.parseResult.parserErrors as any[])
        .map((e: any) => e.message);
}

// ─── Basic constructs ────────────────────────────────────────────────────────

describe('Package', () => {
    it('parses a simple package', async () => {
        const model = await parseValid(`
            package MyPackage {
            }
        `);
        expect(model.members).toHaveLength(1);
        const pkg = model.members[0] as PackageDeclaration;
        expect(pkg.$type).toBe('PackageDeclaration');
        expect(pkg.name).toBe('MyPackage');
    });

    it('parses nested packages', async () => {
        const model = await parseValid(`
            package Outer {
                package Inner {
                }
            }
        `);
        const outer = model.members[0] as PackageDeclaration;
        expect(outer.name).toBe('Outer');
        const inner = outer.members[0] as PackageDeclaration;
        expect(inner.$type).toBe('PackageDeclaration');
        expect(inner.name).toBe('Inner');
    });
});

describe('Import', () => {
    it('parses wildcard import', async () => {
        const model = await parseValid(`
            package Test {
                import MEMO_Ontology_Medical::*;
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const imp = pkg.members[0];
        expect(imp.$type).toBe('ImportDeclaration');
        if (imp.$type === 'ImportDeclaration') {
            expect(imp.path).toBe('MEMO_Ontology_Medical::*');
        }
    });

    it('parses qualified import', async () => {
        const model = await parseValid(`
            package Test {
                import MEMO_Ontology_Core::Stakeholder;
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const imp = pkg.members[0];
        if (imp.$type === 'ImportDeclaration') {
            expect(imp.path).toBe('MEMO_Ontology_Core::Stakeholder');
        }
    });
});

// ─── Definitions ─────────────────────────────────────────────────────────────

describe('PartDefinition', () => {
    it('parses part def with attributes', async () => {
        const model = await parseValid(`
            package Test {
                part def Actor {
                    attribute name : String;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const partDef = pkg.members[0] as PartDefinition;
        expect(partDef.$type).toBe('PartDefinition');
        expect(partDef.name).toBe('Actor');
        expect(partDef.body).toHaveLength(1);
        const attr = partDef.body[0] as AttributeMember;
        expect(attr.name).toBe('name');
        expect(attr.type).toBe('String');
    });

    it('parses part def with specialization', async () => {
        const model = await parseValid(`
            package Test {
                part def Stakeholder :> Actor {
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const partDef = pkg.members[0] as PartDefinition;
        expect(partDef.name).toBe('Stakeholder');
        expect(partDef.specialization?.superType).toBe('Actor');
    });

    it('parses part def with doc comment', async () => {
        const model = await parseValid(`
            package Test {
                part def Actor {
                    doc /* A person or external system. */
                    attribute name : String;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const partDef = pkg.members[0] as PartDefinition;
        expect(partDef.body).toHaveLength(2);
        const doc = partDef.body[0] as DocComment;
        expect(doc.$type).toBe('DocComment');
        expect(doc.content).toContain('A person or external system.');
    });

    it('parses part def with nested part member', async () => {
        const model = await parseValid(`
            package Test {
                part def System {
                    attribute name : String;
                    part subsystems : Subsystem[0..*];
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const partDef = pkg.members[0] as PartDefinition;
        expect(partDef.body).toHaveLength(2);
        const partMember = partDef.body[1];
        expect(partMember.$type).toBe('PartMember');
    });
});

describe('RequirementDefinition', () => {
    it('parses requirement def with attributes', async () => {
        const model = await parseValid(`
            package Test {
                requirement def Requirement {
                    attribute reqId : String;
                    attribute title : String;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const reqDef = pkg.members[0] as RequirementDefinition;
        expect(reqDef.$type).toBe('RequirementDefinition');
        expect(reqDef.name).toBe('Requirement');
        expect(reqDef.body).toHaveLength(2);
    });

    it('parses requirement def with specialization', async () => {
        const model = await parseValid(`
            package Test {
                requirement def Hazard :> Requirement {
                    attribute hazardId : String;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const reqDef = pkg.members[0] as RequirementDefinition;
        expect(reqDef.specialization?.superType).toBe('Requirement');
    });
});

describe('ActionDefinition', () => {
    it('parses action def', async () => {
        const model = await parseValid(`
            package Test {
                action def SystemFunction {
                    attribute name : String;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const actionDef = pkg.members[0] as ActionDefinition;
        expect(actionDef.$type).toBe('ActionDefinition');
        expect(actionDef.name).toBe('SystemFunction');
    });
});

describe('ConnectionDefinition', () => {
    it('parses connection def with ends', async () => {
        const model = await parseValid(`
            package Test {
                connection def Aggregation {
                    end whole[1];
                    end part[0..*];
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const connDef = pkg.members[0] as ConnectionDefinition;
        expect(connDef.$type).toBe('ConnectionDefinition');
        expect(connDef.name).toBe('Aggregation');
        expect(connDef.body).toHaveLength(2);

        const end1 = connDef.body[0] as EndDeclaration;
        expect(end1.$type).toBe('EndDeclaration');
        expect(end1.name).toBe('whole');
        expect(end1.multiplicity?.exact).toBe(1); // Langium converts INT to number

        const end2 = connDef.body[1] as EndDeclaration;
        expect(end2.name).toBe('part');
        expect(end2.multiplicity?.lower).toBe(0); // Langium converts INT to number
        expect(end2.multiplicity?.unbounded).toBe(true);
    });

    it('parses connection def with doc and ends', async () => {
        const model = await parseValid(`
            package Test {
                connection def TraceTo {
                    doc /* Directed traceability. */
                    end source[1];
                    end target[1];
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const connDef = pkg.members[0] as ConnectionDefinition;
        expect(connDef.body).toHaveLength(3);
        expect(connDef.body[0].$type).toBe('DocComment');
        expect(connDef.body[1].$type).toBe('EndDeclaration');
    });

    it('parses connection def with typed ends', async () => {
        const model = await parseValid(`
            package Test {
                connection def Mitigates {
                    doc /* A risk control mitigates a hazard. */
                    end control : RiskControl [1];
                    end hazard : Hazard [1];
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const connDef = pkg.members[0] as ConnectionDefinition;
        expect(connDef.name).toBe('Mitigates');
        expect(connDef.body).toHaveLength(3); // doc + 2 ends

        const end1 = connDef.body[1] as EndDeclaration;
        expect(end1.$type).toBe('EndDeclaration');
        expect(end1.name).toBe('control');
        expect(end1.type).toBe('RiskControl');
        expect(end1.multiplicity?.exact).toBe(1);

        const end2 = connDef.body[2] as EndDeclaration;
        expect(end2.name).toBe('hazard');
        expect(end2.type).toBe('Hazard');
        expect(end2.multiplicity?.exact).toBe(1);
    });

    it('parses connection def with mixed typed and untyped ends', async () => {
        const model = await parseValid(`
            package Test {
                connection def Satisfy {
                    end satisfiedBy[1];
                    end satisfies : Requirement [1];
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const connDef = pkg.members[0] as ConnectionDefinition;
        expect(connDef.body).toHaveLength(2);

        const end1 = connDef.body[0] as EndDeclaration;
        expect(end1.name).toBe('satisfiedBy');
        expect(end1.type).toBeUndefined();
        expect(end1.multiplicity?.exact).toBe(1);

        const end2 = connDef.body[1] as EndDeclaration;
        expect(end2.name).toBe('satisfies');
        expect(end2.type).toBe('Requirement');
        expect(end2.multiplicity?.exact).toBe(1);
    });
});

describe('EnumDefinition', () => {
    it('parses enum def with literals', async () => {
        const model = await parseValid(`
            package Test {
                enum def SeverityLevel {
                    enum Negligible;
                    enum Minor;
                    enum Serious;
                    enum Critical;
                    enum Catastrophic;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const enumDef = pkg.members[0] as EnumDefinition;
        expect(enumDef.$type).toBe('EnumDefinition');
        expect(enumDef.name).toBe('SeverityLevel');
        expect(enumDef.literals).toHaveLength(5);
        expect(enumDef.literals[0].name).toBe('Negligible');
        expect(enumDef.literals[4].name).toBe('Catastrophic');
    });
});

describe('PortDefinition', () => {
    it('parses port def with specialization', async () => {
        const model = await parseValid(`
            package Test {
                port def Port { }
                port def PortEthernet :> Port { }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const portDef = pkg.members[1] as PortDefinition;
        expect(portDef.name).toBe('PortEthernet');
        expect(portDef.specialization?.superType).toBe('Port');
    });
});

describe('InterfaceDefinition', () => {
    it('parses interface def with specialization', async () => {
        const model = await parseValid(`
            package Test {
                interface def SoftwareInterface :> Interface { }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const ifDef = pkg.members[0] as InterfaceDefinition;
        expect(ifDef.$type).toBe('InterfaceDefinition');
        expect(ifDef.name).toBe('SoftwareInterface');
        expect(ifDef.specialization?.superType).toBe('Interface');
    });
});

describe('AttributeDefinition', () => {
    it('parses attribute def', async () => {
        const model = await parseValid(`
            package Test {
                attribute def DataType { }
                attribute def RosMessage :> DataType { }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const attrDef = pkg.members[1] as AttributeDefinition;
        expect(attrDef.$type).toBe('AttributeDefinition');
        expect(attrDef.name).toBe('RosMessage');
        expect(attrDef.specialization?.superType).toBe('DataType');
    });
});

describe('Architecture fixture: methodology scope expressions', () => {
    it('parses explicit scalar methodology scope entries', async () => {
        const model = await parseValid(`
            package memo::methodology::gpca::scope {
                part gpcaScope : MethodologyScope {
                    attribute includedArchLayer = "operational";
                    attribute includedArchLayer = "functional";
                    attribute includedStandard = "ISO 14971";
                    attribute excludedKind = "SOUPComponent";
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const scope = pkg.members[0] as PartUsage;
        expect(scope.body).toHaveLength(4);
    });

    it('rejects set literals in attribute assignments', async () => {
        const errors = await parseErrors(`
            package memo::methodology::default::scope {
                part defaultLayerSet : MethodologyLayerSet {
                    attribute layers = {"operational", "functional"};
                }
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects set-difference expressions in attribute assignments', async () => {
        const errors = await parseErrors(`
            package memo::methodology::gpca::scope {
                part gpcaScope : MethodologyScope {
                    attribute includedArchLayers = defaultLayerSet.layers - {"cybersecurity"};
                }
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });
});

describe('Architecture fixture: view and presentation syntax', () => {
    it('parses view def with scalar presentationKind fallback entries', async () => {
        const model = await parseValid(`
            package memo::ontology::views::risk_management {
                import memo::base::stdlib::*;

                view def RiskMatrixView :> DiagramView {
                    attribute presentationKind = PresentationKind::riskTable;
                    attribute presentationKind = PresentationKind::matrix;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const viewDef = pkg.members[1] as ViewDefinition;
        expect(viewDef.$type).toBe('ViewDefinition');
        expect(viewDef.name).toBe('RiskMatrixView');
        expect(viewDef.specialization?.superType).toBe('DiagramView');
        expect(viewDef.body).toHaveLength(2);
    });

    it('rejects private import visibility modifiers', async () => {
        const errors = await parseErrors(`
            package memo::ontology::views::risk_management {
                private import memo::base::stdlib::*;
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects multiplicity on presentationKind type declarations', async () => {
        const errors = await parseErrors(`
            package memo::ontology::views::risk_management {
                view def RiskMatrixView :> DiagramView {
                    attribute presentationKind : PresentationKind[*];
                }
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects collection-valued presentationKind assignments', async () => {
        const errors = await parseErrors(`
            package memo::ontology::views::risk_management {
                view def RiskMatrixView :> DiagramView {
                    attribute presentationKind = { PresentationKind::riskTable };
                }
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });
});

// ─── Usages ──────────────────────────────────────────────────────────────────

describe('PartUsage', () => {
    it('parses part usage with attribute redefines', async () => {
        const model = await parseValid(`
            package Test {
                part clinician : Actor {
                    attribute redefines name = "Clinician";
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const usage = pkg.members[0] as PartUsage;
        expect(usage.$type).toBe('PartUsage');
        expect(usage.name).toBe('clinician');
        expect(usage.type).toBe('Actor');

        const attr = usage.body[0] as AttributeMember;
        expect(attr.redefines).toBe(true);
        expect(attr.name).toBe('name');
        const val = attr.value as StringValue;
        expect(val.$type).toBe('StringValue');
        expect(val.value).toBe('Clinician'); // Langium strips quotes
    });

    it('parses part usage with integer attribute', async () => {
        const model = await parseValid(`
            package Test {
                part mainProcessor : Microcontroller {
                    attribute redefines numberOfCores = 1;
                    attribute redefines ram = 256;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const usage = pkg.members[0] as PartUsage;
        const attr = usage.body[0] as AttributeMember;
        const val = attr.value as IntValue;
        expect(val.$type).toBe('IntValue');
        expect(val.value).toBe(1); // Langium converts INT to number
    });

    it('parses part usage with boolean attribute', async () => {
        const model = await parseValid(`
            package Test {
                part c : Catheter {
                    attribute redefines isAblation = true;
                    attribute redefines isDiagnostic = false;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const usage = pkg.members[0] as PartUsage;
        const attr1 = usage.body[0] as AttributeMember;
        expect((attr1.value as BooleanValue).value).toBe('true');
        const attr2 = usage.body[1] as AttributeMember;
        expect((attr2.value as BooleanValue).value).toBe('false');
    });

    it('parses part usage with enum attribute value', async () => {
        const model = await parseValid(`
            package Test {
                requirement harmAdverseDrugReaction : Harm {
                    attribute redefines severity = SeverityLevel::Catastrophic;
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const usage = pkg.members[0] as RequirementUsage;
        const attr = usage.body[0] as AttributeMember;
        const val = attr.value as EnumValue;
        expect(val.$type).toBe('EnumValue');
        expect(val.enumRef).toBe('SeverityLevel::Catastrophic');
    });
});

describe('RequirementUsage', () => {
    it('parses requirement usage with doc comment', async () => {
        const model = await parseValid(`
            package Test {
                requirement unAccurateDelivery : UserNeed {
                    attribute redefines reqId = "UN-001";
                    attribute redefines title = "Accurate Medication Delivery";
                    doc /* The clinician needs the pump to deliver medication. */
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const usage = pkg.members[0] as RequirementUsage;
        expect(usage.$type).toBe('RequirementUsage');
        expect(usage.name).toBe('unAccurateDelivery');
        expect(usage.type).toBe('UserNeed');
        expect(usage.body).toHaveLength(3);
    });
});

describe('ActionUsage', () => {
    it('parses action usage', async () => {
        const model = await parseValid(`
            package Test {
                action sfRegulateFlow : SystemFunction {
                    attribute redefines name = "Regulate Flow Rate";
                }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const usage = pkg.members[0] as ActionUsage;
        expect(usage.$type).toBe('ActionUsage');
        expect(usage.name).toBe('sfRegulateFlow');
        expect(usage.type).toBe('SystemFunction');
    });
});

describe('PortUsage', () => {
    it('parses port usage with empty body', async () => {
        const model = await parseValid(`
            package Test {
                port pressureSensorPort : Port { }
                port networkPort : PortEthernet { }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        expect(pkg.members).toHaveLength(2);
        const p1 = pkg.members[0] as PartUsage;
        expect(p1.name).toBe('pressureSensorPort');
    });
});

// ─── Connection usage ────────────────────────────────────────────────────────

describe('ConnectionUsage', () => {
    it('parses typed connection usage', async () => {
        const model = await parseValid(`
            package Test {
                connection : Mitigates connect control ::> rcFlowRateLimiter to hazard ::> hazOverInfusion;
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const conn = pkg.members[0] as ConnectionUsage;
        expect(conn.$type).toBe('ConnectionUsage');
        expect(conn.type).toBe('Mitigates');
        expect(conn.source.endName).toBe('control');
        expect(conn.source.ref).toBe('rcFlowRateLimiter');
        expect(conn.target.endName).toBe('hazard');
        expect(conn.target.ref).toBe('hazOverInfusion');
    });

    it('parses TraceTo connection', async () => {
        const model = await parseValid(`
            package Test {
                connection : TraceTo connect source ::> unAccurateDelivery to target ::> sysReqFlowAccuracy;
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const conn = pkg.members[0] as ConnectionUsage;
        expect(conn.type).toBe('TraceTo');
        expect(conn.source.endName).toBe('source');
        expect(conn.target.endName).toBe('target');
    });

    it('parses AllocateTo connection', async () => {
        const model = await parseValid(`
            package Test {
                connection : AllocateTo connect function ::> sfRegulateFlow to structure ::> flowController;
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        const conn = pkg.members[0] as ConnectionUsage;
        expect(conn.type).toBe('AllocateTo');
        expect(conn.source.endName).toBe('function');
        expect(conn.target.endName).toBe('structure');
    });
});

// ─── Full file integration tests ─────────────────────────────────────────────

describe('Integration: Ontology subset', () => {
    it('parses a representative ontology subset', async () => {
        const model = await parseValid(`
            package MEMO_Ontology {

                // Business Analysis
                part def Actor {
                    doc /* A person or external system that interacts with the system. */
                    attribute name : String;
                }

                part def Stakeholder :> Actor {
                    doc /* A party with interest. */
                }

                // Requirements
                enum def RequirementsCategory {
                    enum Functional;
                    enum Performance;
                    enum Safety;
                }

                requirement def Requirement {
                    attribute reqId : String;
                    attribute title : String;
                    attribute category : RequirementsCategory;
                }

                requirement def Hazard {
                    attribute hazardId : String;
                    attribute title : String;
                }

                // Functional
                action def SystemFunction {
                    attribute name : String;
                }

                // Interfaces
                port def Port { }
                port def PortEthernet :> Port { }

                interface def Interface { }
                interface def SoftwareInterface :> Interface { }

                // Connections
                connection def TraceTo {
                    doc /* Directed traceability. */
                    end source[1];
                    end target[1];
                }

                connection def Aggregation {
                    end whole[1];
                    end part[0..*];
                }

                // Cross-cutting
                attribute def DataType { }
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        expect(pkg.name).toBe('MEMO_Ontology');
        // Count all members (definitions)
        expect(pkg.members.length).toBeGreaterThanOrEqual(12);
    });
});

describe('Integration: Device model subset', () => {
    it('parses a representative infusion pump subset', async () => {
        const model = await parseValid(`
            package InfusionPump {
                import MEMO_Ontology_Medical::*;

                // Business layer
                part clinician : Actor {
                    attribute redefines name = "Clinician";
                }

                part patient : Stakeholder {
                    attribute redefines name = "Patient";
                }

                // Requirements
                requirement unAccurateDelivery : UserNeed {
                    attribute redefines reqId = "UN-001";
                    attribute redefines title = "Accurate Medication Delivery";
                    doc /* The clinician needs the pump to deliver medication
                         * at the prescribed rate. */
                }

                requirement sysReqFlowAccuracy : SystemRequirement {
                    attribute redefines reqId = "SYS-REQ-001";
                    attribute redefines title = "Flow Rate Accuracy";
                }

                // Risk
                requirement hazOverInfusion : Hazard {
                    attribute redefines hazardId = "HAZ-001";
                    attribute redefines title = "Over-Infusion";
                }

                requirement rcFlowRateLimiter : RiskControl {
                    attribute redefines rcId = "RC-001";
                    attribute redefines title = "Software Flow Rate Limiter";
                }

                // Functional
                action sfRegulateFlow : SystemFunction {
                    attribute redefines name = "Regulate Flow Rate";
                }

                // Logical
                part infusionPumpSystem : System {
                    attribute redefines name = "Infusion Pump System";
                }

                // Physical
                part mainProcessor : Microcontroller {
                    attribute redefines name = "Main Processor";
                    attribute redefines numberOfCores = 1;
                    attribute redefines ram = 256;
                }

                // Software
                part flowController : SoftwareComponent {
                    attribute redefines name = "Flow Rate Controller";
                    attribute redefines safetyClassification = "C";
                }

                // Ports
                port pressureSensorPort : Port { }
                port networkPort : PortEthernet { }

                // Interfaces
                interface def PressureDataInterface :> SoftwareInterface { }

                // UI
                part mainScreen : UIScreen {
                    attribute redefines name = "Main Infusion Screen";
                }

                // Verification
                part testFlowAccuracy : Test {
                    attribute redefines testId = "TC-001";
                    attribute redefines name = "Flow Rate Accuracy Verification";
                }

                // Traceability connections
                connection : TraceTo connect source ::> unAccurateDelivery to target ::> sysReqFlowAccuracy;
                connection : Mitigates connect control ::> rcFlowRateLimiter to hazard ::> hazOverInfusion;
                connection : AllocateTo connect function ::> sfRegulateFlow to structure ::> flowController;
                connection : Satisfy connect satisfiedBy ::> flowController to satisfies ::> sysReqFlowAccuracy;
                connection : Verify connect verifiedBy ::> testFlowAccuracy to verifies ::> sysReqFlowAccuracy;
            }
        `);
        const pkg = model.members[0] as PackageDeclaration;
        expect(pkg.name).toBe('InfusionPump');

        // Count different member types
        const imports = pkg.members.filter(m => m.$type === 'ImportDeclaration');
        const connections = pkg.members.filter(m => m.$type === 'ConnectionUsage');
        expect(imports).toHaveLength(1);
        expect(connections).toHaveLength(5);
    });
});
