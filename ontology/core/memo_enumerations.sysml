package memo::core::enumerations {
    enum def ConcernKind { enum safety; enum usability; enum cybersecurity; enum performance; enum interoperability; enum reliability; enum privacy; enum regulatory; }
    enum def RequirementSourceKind { enum stakeholderNeed; enum risk; enum designDecision; enum changeRequest; }
    enum def RequirementStatusKind { enum draft; enum approved; enum implemented; enum verified; enum validated; enum retired; }
    enum def InterfaceDomainKind { enum logical; enum software; enum hardware; enum user; enum mixed; }
    enum def InterfaceKind { enum data; enum control; enum analogSignal; enum digitalSignal; enum power; enum network; enum api; enum userInteraction; enum notification; enum logging; enum mechanical; enum fluidic; }
    enum def FlowKind { enum information; enum command; enum status; enum telemetry; enum alarm; enum configuration; enum measurement; enum audit; enum power; }
    enum def DirectionKind { enum in; enum out; enum inout; enum bidirectional; }
    enum def CriticalityKind { enum low; enum medium; enum high; enum catastrophic; }
    enum def SafetyClassKind { enum none; enum A; enum B; enum C; }
    enum def ComplexityKind { enum low; enum medium; enum high; enum complex; }
    enum def LifecycleStateKind { enum concept; enum development; enum released; enum maintenance; enum obsolete; }
    enum def VerificationMethodKind { enum inspection; enum analysis; enum demonstration; enum test; enum simulation; enum formalProof; enum modelChecking; }
    enum def ArtifactKind { enum plan; enum requirementSpecification; enum architectureDescription; enum softwareDesignDescription; enum riskRecord; enum traceMatrix; enum testProtocol; enum testReport; enum evidenceRecord; enum cybersecurityAssessment; enum threatModel; }
    enum def RiskControlKind { enum inherentSafeDesign; enum protectiveMeasure; enum informationForSafety; enum alarm; enum interlock; enum monitoring; enum plausibilityCheck; }
    enum def HazardTypeKind { enum overdose; enum underdose; enum occlusion; enum freeFlow; enum airInLine; enum reverseDelivery; enum emptyReservoir; enum delayedAlarm; enum softwareFault; enum usabilityFault; enum networkFault; }
    enum def DocumentViewKind { enum DHF; enum SDD; enum RMF; enum VV; enum ArchitectureDescription; enum CybersecurityAssessment; enum ThreatModel; }
    enum def SchedulingPolicyKind { enum nonRealTime; enum roundRobin; enum fixedPriorityPreemptive; enum rateMonotonic; enum deadlineMonotonic; enum EDF; }
    enum def LinkStatusKind { enum planned; enum active; enum verified; enum obsolete; }
    enum def BehaviorPropertyKind { enum stateInvariant; enum transitionRule; enum temporalProperty; enum safetyProperty; enum livenessProperty; enum assume; enum guarantee; }
    enum def PropertyLanguageKind { enum naturalLanguage; enum pseudoFormal; enum agreeLike; enum ltlLike; enum ctlLike; }
    enum def MethodRigorKind { enum lightweight; enum balanced; enum formal; }
    enum def RuleStrengthKind { enum optional; enum recommended; enum required; enum forbidden; }
    enum def RulePredicateKind { enum requireRelationship; enum conditionalRequireRelationship; enum requireAttribute; enum uniqueAttribute; enum cardinalityCheck; enum coverageCheck; }
    enum def RuleSeverityKind { enum error; enum warning; enum info; }
    enum def RuleCategoryKind { enum closure; enum coverage; enum lifecycle; enum crossLayer; enum quantitative; }
    enum def WorkflowStageKind { enum context; enum requirements; enum behavior; enum architecture; enum interfaces; enum risk; enum verification; enum evidence; enum documents; }
    enum def AudienceKind { enum systemArchitect; enum softwareArchitect; enum hardwareEngineer; enum safetyEngineer; enum verificationEngineer; enum regulatoryEngineer; enum projectLead; enum securityEngineer; enum privacyEngineer; }
    enum def ThreatCategoryKind { enum spoofing; enum tampering; enum repudiation; enum informationDisclosure; enum denialOfService; enum elevationOfPrivilege; enum privacyLoss; enum supplyChain; }
    enum def CyberControlKind { enum prevent; enum detect; enum respond; enum recover; enum hardening; enum monitoring; enum authentication; enum authorization; enum encryption; enum integrityProtection; enum audit; enum updateMechanism; }
    enum def AssetKind { enum data; enum credential; enum configuration; enum software; enum hardware; enum networkConnection; enum auditRecord; enum safetyCriticalFunction; }
    enum def ViewOutputKind { enum diagram; enum table; enum matrix; enum documentSection; enum dashboard; }
    enum def PresentationKind { enum blockDiagram; enum internalDiagram; enum activityDiagram; enum stateDiagram; enum riskTable; enum traceMatrix; enum narrativeSection; enum custom; }
}
