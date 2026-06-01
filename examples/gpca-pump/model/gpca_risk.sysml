package memo {
    package examples {
        package gpca {
            package risk {
                private import memo::architecture::risk::*;
                private import memo::core::common::Citation;

                // ── CriSys source citations ──────────────────────────────────────
                part citeCriSysHazard : Citation { attribute id = "CITE-001"; attribute name = "CriSysHazardAnalysis"; attribute source = "University of Minnesota CriSys GPCA Hazard Analysis"; attribute section = "Table 3: Identified Hazards"; attribute uri = "https://crisys.cs.umn.edu/gpca"; attribute year = "2010"; }
                part citeCriSysReqs : Citation { attribute id = "CITE-002"; attribute name = "CriSysRequirements"; attribute source = "University of Minnesota CriSys GPCA Requirements"; attribute section = "Section 4: Safety Requirements"; attribute uri = "https://crisys.cs.umn.edu/gpca"; attribute year = "2010"; }
                part citeCriSysModes : Citation { attribute id = "CITE-003"; attribute name = "CriSysModeAnalysis"; attribute source = "University of Minnesota CriSys GPCA Mode Analysis"; attribute section = "Section 5: Operational Modes and Transitions"; attribute uri = "https://crisys.cs.umn.edu/gpca"; attribute year = "2010"; }

                // ── Hazards and risk chain ────────────────────────────────────────
                part overdoseHazard : Hazard { attribute id = "HZ-001"; attribute name = "Overdose"; attribute hazardType = HazardTypeKind::drugDeliveryError; attribute severity = CriticalityKind::catastrophic; attribute foreseeable = true; attribute sourceReference = "CITE-001: CriSys Hazard Analysis, Table 3"; }
                part seqFrequentBolus : SequenceOfEvents { attribute id = "SEQ-001"; attribute name = "FrequentPatientBolusSequence"; attribute initiatingEvent = "Patient bolus request during lockout"; attribute contributingFactors = "Lockout violation or max bolus exceeded"; attribute sourceReference = "CITE-001: CriSys Hazard Analysis, Table 3"; }
                part hsExcessInfusion : HazardousSituation { attribute id = "HS-001"; attribute name = "PatientExposedToExcessInfusion"; attribute exposedPersons = "patient"; attribute operatingCondition = "ACTIVE therapy"; attribute sourceReference = "CITE-001: CriSys Hazard Analysis, Table 3"; }
                part harmRespiratoryDepression : Harm { attribute id = "HM-001"; attribute name = "RespiratoryDepression"; attribute clinicalImpact = "serious injury or death"; attribute reversibility = "potentially irreversible"; attribute criticality = CriticalityKind::catastrophic; attribute sourceReference = "CITE-001: CriSys Hazard Analysis, Table 3"; }
                part riskBefore : RiskBeforeMitigation { attribute id = "RISK-B-001"; attribute name = "OverdoseRiskBeforeMitigation"; attribute driverKind = "risk"; attribute probabilityEstimate = "Occasional"; attribute severityEstimate = "Catastrophic"; attribute riskLevel = "High"; attribute acceptability = "Unacceptable"; attribute estimationBasis = "mode and bolus hazard analysis"; attribute analysisContext = "patient bolus and active mode control"; attribute foreseeableMisuseIncluded = true; attribute sourceReference = "CITE-003: CriSys Mode Analysis, Section 5"; }
                part riskMatrix : RiskMatrix { attribute id = "RMX-001"; attribute name = "StandardRiskMatrix"; attribute probabilityScaleDefinition = "Remote, Occasional, Probable"; attribute severityScaleDefinition = "Minor, Serious, Catastrophic"; attribute riskLevelMapping = "matrix based"; attribute acceptabilityThresholds = "High unacceptable"; }
                part lockoutControl : RiskControl { attribute id = "RC-001"; attribute name = "LockoutAndMaxBolusEnforcement"; attribute controlKind = RiskControlKind::inherentSafeDesign; attribute implementationKind = RiskControlImplementationKind::softwareDesign; attribute verificationStatus = "planned"; attribute sourceReference = "CITE-002: CriSys Requirements, Section 4"; }
                part riskAfter : RiskAfterMitigation { attribute id = "RISK-A-001"; attribute name = "OverdoseRiskAfterMitigation"; attribute driverKind = "risk"; attribute probabilityEstimate = "Remote"; attribute severityEstimate = "Catastrophic"; attribute riskLevel = "Medium"; attribute acceptability = "Conditionally Acceptable"; attribute residualProbability = "Remote"; attribute residualSeverity = "Catastrophic"; attribute residualAcceptability = "Acceptable with review"; attribute benefitRiskRequired = false; }
                part residualEval : OverallResidualRiskEvaluation { attribute id = "RREV-001"; attribute name = "OverallResidualRiskEvaluation"; attribute conclusion = "Residual overdose risk acceptable with lockout, pause-on-alarm, and verification."; attribute reviewer = "Safety review"; }
            }
        }
    }
}
