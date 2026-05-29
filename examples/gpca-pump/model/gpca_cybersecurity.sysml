package memo::examples::gpca::cybersecurity {
    private import memo::architecture::cybersecurity::*;
    private import memo::architecture::requirements::*;
    private import memo::architecture::risk::*;
    private import memo::architecture::assurance::*;
    private import memo::core::enumerations::*;
    private import memo::core::relationships::*;
    private import memo::examples::gpca::architecture::*;
    private import memo::examples::gpca::risk::*;
    private import memo::examples::gpca::requirements::*;
    private import memo::examples::gpca::verification::*;

    part therapyConfigurationAsset : CybersecurityAsset {
        attribute id = "AST-CYB-001";
        attribute name = "TherapyConfigurationAsset";
        attribute assetKind = AssetKind::configuration;
        attribute confidentialityNeed = "medium";
        attribute integrityNeed = "very high";
        attribute availabilityNeed = "high";
        attribute privacyRelevant = false;
        attribute safetyRelevant = true;
        attribute owningLayer = "software_structure";
    }

    part patientEventLogAsset : CybersecurityAsset {
        attribute id = "AST-CYB-002";
        attribute name = "PatientEventLogAsset";
        attribute assetKind = AssetKind::auditRecord;
        attribute confidentialityNeed = "high";
        attribute integrityNeed = "high";
        attribute availabilityNeed = "medium";
        attribute privacyRelevant = true;
        attribute safetyRelevant = false;
        attribute owningLayer = "software_structure";
    }

    item maintenancePortBoundary : TrustBoundary {
        attribute id = "TB-001";
        attribute name = "MaintenancePortBoundary";
        attribute boundaryType = "service-access";
        attribute crossingDescription = "Boundary between service tooling and therapy controller runtime.";
        attribute boundaryLayer = "physical_interfaces";
    }

    item unauthorizedConfigChangeThreat : Threat {
        attribute id = "TH-001";
        attribute name = "UnauthorizedTherapyConfigurationChange";
        attribute driverKind = "cybersecurity";
        attribute threatCategory = ThreatCategoryKind::tampering;
        attribute attackVector = "maintenance port";
        attribute threatSource = "unauthorized actor with local access";
        attribute precondition = "maintenance interface exposed without strong authentication";
        attribute affectedConcern = ConcernKind::cybersecurity;
        attribute defaultTechnique = "STRIDE tampering";
    }

    item weakServiceAuthentication : Vulnerability {
        attribute id = "VULN-001";
        attribute name = "WeakServiceAuthentication";
        attribute weakness = "service mode relies on shared default credential";
        attribute exploitability = "moderate";
        attribute discoveryMethod = "architecture review";
        attribute affectedLayer = "software_structure";
        attribute cweReference = "CWE-798";
    }

    item tamperedConfigurationScenario : ThreatScenario {
        attribute id = "SCN-001";
        attribute name = "TamperedTherapyConfigurationScenario";
        attribute scenarioSummary = "An attacker uses the maintenance pathway to alter lockout or dose parameters.";
        attribute strideCategory = ThreatCategoryKind::tampering;
        attribute impactSummary = "May enable unsafe therapy delivery or bypass safeguards.";
        attribute entryPoint = "maintenance port";
        attribute attackerGoal = "alter therapy limits";
    }

    item unsafeDoseCyberHazard : CyberHazard {
        attribute id = "CHZ-001";
        attribute name = "UnsafeTherapyConfigurationHazard";
        attribute hazardType = HazardTypeKind::overdose;
        attribute foreseeable = true;
        attribute securityImpact = "loss of configuration integrity";
        attribute safetyImpact = "unsafe dose delivery";
        attribute privacyImpact = "none";
        attribute operationalImpact = "therapy interruption or unsafe continuation";
    }

    item configurationTamperingRisk : CyberRisk {
        attribute id = "CRISK-001";
        attribute name = "ConfigurationTamperingRisk";
        attribute driverKind = "cyber risk";
        attribute probabilityEstimate = "Occasional";
        attribute severityEstimate = "Catastrophic";
        attribute riskLevel = "High";
        attribute acceptability = "Unacceptable";
        attribute exploitabilityEstimate = "Moderate";
        attribute detectabilityEstimate = "Low";
        attribute attackFeasibility = "Moderate with local access";
        attribute patientImpact = "Potential overdose if therapy limits are changed.";
    }

    part strongServiceAuthentication : CyberMitigation {
        attribute id = "CMIT-001";
        attribute name = "StrongServiceAuthenticationAndAudit";
        attribute controlKind = RiskControlKind::protectiveMeasure;
        attribute implementationKind = "mutual authentication, role control, signed configuration updates, and audit logging";
        attribute verificationStatus = "planned";
        attribute controlCategory = CyberControlKind::authentication;
        attribute defenseStrategy = "authenticate, authorize, audit";
        attribute defaultFramework = "STRIDE + FDA cybersecurity";
        attribute verificationExpectation = "verify only authenticated and integrity-protected configuration changes are accepted";
    }

    requirement reqAuthenticatedServiceAccess : SecurityRequirement {
        attribute id = "SREQ-001";
        attribute name = "AuthenticatedServiceAccess";
        attribute statement = "The system shall require authenticated and authorized service access before any therapy configuration parameter can be modified.";
        attribute sourceKind = RequirementSourceKind::risk;
        attribute concernKind = ConcernKind::cybersecurity;
        attribute safetyClass = SafetyClassKind::C;
        attribute status = RequirementStatusKind::approved;
        attribute acceptanceCriteria = "Unauthenticated or unauthorized attempts to modify therapy configuration are rejected and logged.";
        attribute subjectDescription = "maintenance and configuration path";
        attribute actorDescription = "service personnel";
        attribute assumptionSummary = "cryptographic identity available";
        attribute guaranteeSummary = "only authorized service access can change therapy configuration";
        attribute securityObjective = "integrity";
        attribute abuseCaseReference = "TamperedTherapyConfigurationScenario";
        attribute defaultCategory = ThreatCategoryKind::tampering;
    }

    part vcAuthenticatedServiceAccess : VerificationCase {
        attribute id = "CVER-001";
        attribute name = "VerifyAuthenticatedServiceAccess";
        attribute methodKind = VerificationMethodKind::test;
        attribute acceptanceCriteria = "Only authenticated and authorized service sessions may modify therapy configuration; all attempts are logged.";
        attribute status = "planned";
    }

    part lnkAssetThreat : AssetThreatLink {
        attribute id = "CYL-001";
        attribute name = "TherapyConfigThreatLink";
        attribute threatRole = "targeted asset";
        attribute linkStatus = LinkStatusKind::active;
        part protectedAsset :> therapyConfigurationAsset;
        part realizedThreat :> unauthorizedConfigChangeThreat;
    }

    part lnkThreatVulnerability : ThreatVulnerabilityLink {
        attribute id = "CYL-002";
        attribute name = "ThreatWeakAuthLink";
        attribute linkStatus = LinkStatusKind::active;
        part realizedThreat :> unauthorizedConfigChangeThreat;
        part enablingVulnerability :> weakServiceAuthentication;
    }

    part lnkThreatScenario : ThreatScenarioLink {
        attribute id = "CYL-003";
        attribute name = "ThreatScenarioLink";
        attribute linkStatus = LinkStatusKind::active;
        part realizedThreat :> unauthorizedConfigChangeThreat;
        part scenario :> tamperedConfigurationScenario;
    }

    part lnkVulnerabilityMitigation : VulnerabilityMitigationLink {
        attribute id = "CYL-004";
        attribute name = "WeakAuthMitigationLink";
        attribute linkStatus = LinkStatusKind::planned;
        part enablingVulnerability :> weakServiceAuthentication;
        part mitigation :> strongServiceAuthentication;
    }

    part lnkThreatRequirement : CyberRequirementDerivationLink {
        attribute id = "CYL-005";
        attribute name = "ThreatRequirementLink";
        attribute linkStatus = LinkStatusKind::active;
        part sourceThreatOrRisk :> unauthorizedConfigChangeThreat;
        part targetRequirement :> reqAuthenticatedServiceAccess;
    }

    part lnkCyberSafety : CyberSafetyTraceLink {
        attribute id = "CYL-006";
        attribute name = "CyberToSafetyRiskLink";
        attribute linkStatus = LinkStatusKind::active;
        attribute tracePurpose = "Cyber hazard contributes to existing overdose safety chain.";
        part cyberElement :> configurationTamperingRisk;
        part safetyElement :> riskBefore;
    }

    part lnkBoundaryCrossing : TrustBoundaryCrossingLink {
        attribute id = "CYL-007";
        attribute name = "MaintenanceBoundaryCrossingLink";
        attribute linkStatus = LinkStatusKind::active;
        attribute crossingKind = InterfaceKind::network;
        part boundary :> maintenancePortBoundary;
        part crossingItem :> therapyConfigurationAsset;
    }

    part lnkCyberVerification : VerificationLink {
        attribute id = "CYL-008";
        attribute name = "SecurityRequirementVerificationLink";
        attribute linkStatus = LinkStatusKind::planned;
        part verificationTarget :> reqAuthenticatedServiceAccess;
        part verificationCase :> vcAuthenticatedServiceAccess;
    }

    part lnkCyberMitigationEvidence : EvidenceProductionLink {
        attribute id = "CYL-009";
        attribute name = "MitigationEvidenceLink";
        attribute linkStatus = LinkStatusKind::planned;
        part producer :> vcAuthenticatedServiceAccess;
        part producedEvidence :> evidenceLockout;
    }
}
