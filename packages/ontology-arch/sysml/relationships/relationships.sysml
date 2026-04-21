package MEMO_Ontology_Arch_Relationships {

    // ─── Structural ──────────────────────────────────────────────────────────

    connection def ComposedOf {
        end whole[1];
        end part[0..*];
    }

    connection def DecomposedBy {
        end parent[1];
        end child[0..*];
    }

    connection def Aggregation {
        end whole[1];
        end part[0..*];
    }

    connection def Dependency {
        end client[1];
        end supplier[1];
    }

    connection def Realization {
        end realizing[1];
        end realized[1];
    }

    // ─── Traceability ────────────────────────────────────────────────────────

    connection def TraceTo {
        end source[1];
        end target[1];
    }

    connection def Refines {
        end refined[1];
        end refiner[1];
    }

    connection def Derives {
        end source[1];
        end derived[1];
    }

    connection def Satisfies {
        end satisfiedBy[1];
        end req : MEMO_Ontology_Arch_Verification::Requirement [1];
    }

    connection def Verifies {
        end verificationCase : MEMO_Ontology_Arch_Verification::VerificationCase [1];
        end subject[1];
    }

    connection def ProducesEvidence {
        end activity[1];
        end evidence : MEMO_Ontology_Arch_Verification::Evidence [1];
    }

    connection def Constrains {
        end constraint : MEMO_Ontology_Arch_Functional::ConstraintDefinition [1];
        end constrained[1];
    }

    // ─── Allocation ──────────────────────────────────────────────────────────

    connection def AllocatedTo {
        end function : MEMO_Ontology_Arch_Functional::Function [1];
        end structure[1];
    }

    connection def DeployedOn {
        end software : MEMO_Ontology_Arch_Software::SoftwareComponent [1];
        end hardware : MEMO_Ontology_Arch_Hardware::HardwareComponent [1];
    }

    // ─── Interface & Data Flow ───────────────────────────────────────────────

    connection def ExposesInterface {
        end provider[1];
        end iface : MEMO_Ontology_Arch_Logical::Interface [1];
    }

    connection def ConnectsVia {
        end source : MEMO_Ontology_Arch_Logical::Port [1];
        end target : MEMO_Ontology_Arch_Logical::Port [1];
    }

    connection def Flow {
        end source[1];
        end target[1];
        attribute dataType : String;
    }

    connection def Succession {
        end predecessor[1];
        end successor[1];
    }

    // ─── Behavioral ──────────────────────────────────────────────────────────

    connection def Triggers {
        end event : MEMO_Ontology_Arch_Behavioral::Event [1];
        end target[1];
    }

    connection def Realizes {
        end scenario : MEMO_Ontology_Arch_Behavioral::Scenario [1];
        end userNeed : MEMO_Ontology_Arch_Operational::UserNeed [1];
    }

    connection def Participates {
        end actor : MEMO_Ontology_Arch_Operational::Actor [1];
        end scenario : MEMO_Ontology_Arch_Behavioral::Scenario [1];
    }

    // ─── Safety ──────────────────────────────────────────────────────────────

    connection def Causes {
        end hazard : MEMO_Ontology_Arch_Safety::Hazard [1];
        end situation : MEMO_Ontology_Arch_Safety::HazardousSituation [1];
    }

    connection def LeadsTo {
        end situation : MEMO_Ontology_Arch_Safety::HazardousSituation [1];
        end harm : MEMO_Ontology_Arch_Safety::Harm [1];
    }

    connection def Mitigates {
        end mitigation : MEMO_Ontology_Arch_Safety::Mitigation [1];
        end risk : MEMO_Ontology_Arch_Safety::Risk [1];
    }

    connection def ControlsMitigation {
        end mitigation : MEMO_Ontology_Arch_Safety::Mitigation [1];
        end hazard : MEMO_Ontology_Arch_Safety::Hazard [1];
    }

    connection def IdentifiesRisk {
        end source[1];
        end risk : MEMO_Ontology_Arch_Safety::Risk [1];
    }

    connection def HasFailureMode {
        end component[1];
        end failureMode : MEMO_Ontology_Arch_Safety::FailureMode [1];
    }

    connection def ContributesTo {
        end node : MEMO_Ontology_Arch_Safety::FaultTreeNode [0..*];
        end parent : MEMO_Ontology_Arch_Safety::FaultTreeNode [1];
    }

    connection def InitialRisk {
        end risk : MEMO_Ontology_Arch_Safety::Risk [1];
        end hazard : MEMO_Ontology_Arch_Safety::Hazard [1];
    }

    connection def ResidualRisk {
        end risk : MEMO_Ontology_Arch_Safety::Risk [1];
        end mitigation : MEMO_Ontology_Arch_Safety::Mitigation [0..*];
    }

    // ─── Security ────────────────────────────────────────────────────────────

    connection def ThreatensAsset {
        end threat : MEMO_Ontology_Arch_Security::ThreatScenario [1];
        end asset : MEMO_Ontology_Arch_Security::Asset [1];
    }

    connection def ExploitsVulnerability {
        end threat : MEMO_Ontology_Arch_Security::ThreatScenario [1];
        end target[1];
    }

    connection def MitigatesThreat {
        end control : MEMO_Ontology_Arch_Security::Control [1];
        end threat : MEMO_Ontology_Arch_Security::ThreatScenario [1];
    }

    connection def ProtectsAsset {
        end control : MEMO_Ontology_Arch_Security::Control [1];
        end asset : MEMO_Ontology_Arch_Security::Asset [1];
    }

    connection def CrossesBoundary {
        end source[1];
        end boundary : MEMO_Ontology_Arch_Security::TrustBoundary [1];
    }

    // ─── Privacy ─────────────────────────────────────────────────────────────

    connection def ClassifiesData {
        end dataObject : MEMO_Ontology_Arch_Functional::DataObject [1];
        end category : MEMO_Ontology_Arch_Privacy::DataCategory [1];
    }

    connection def ProcessesData {
        end activity : MEMO_Ontology_Arch_Privacy::ProcessingActivity [1];
        end dataCategory : MEMO_Ontology_Arch_Privacy::DataCategory [1];
    }

    connection def AffectsDataSubject {
        end activity : MEMO_Ontology_Arch_Privacy::ProcessingActivity [1];
        end subjectCategory : MEMO_Ontology_Arch_Privacy::DataSubjectCategory [1];
    }

    connection def GovernsRetention {
        end rule : MEMO_Ontology_Arch_Privacy::RetentionRule [1];
        end dataCategory : MEMO_Ontology_Arch_Privacy::DataCategory [1];
    }

    // ─── Verification ────────────────────────────────────────────────────────

    connection def Implements {
        end component[1];
        end req : MEMO_Ontology_Arch_Verification::Requirement [1];
    }

    connection def AddressesSecurityReq {
        end control : MEMO_Ontology_Arch_Security::Control [1];
        end req : MEMO_Ontology_Arch_Verification::SecurityRequirement [1];
    }

    connection def AddressesPrivacyReq {
        end activity : MEMO_Ontology_Arch_Privacy::ProcessingActivity [1];
        end req : MEMO_Ontology_Arch_Verification::PrivacyRequirement [1];
    }
}
