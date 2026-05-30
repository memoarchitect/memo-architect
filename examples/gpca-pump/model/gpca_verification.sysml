package memo {
    package examples {
        package gpca {
            package verification {
                private import memo::architecture::assurance::*;
                part vcModeRange : VerificationCase { attribute id = "VER-001"; attribute name = "VerifyModeRange"; attribute methodKind = VerificationMethodKind::formalProof; attribute acceptanceCriteria = "Current_System_mode only takes valid exclusive values"; attribute status = "planned"; }
                part vcLockout : VerificationCase { attribute id = "VER-002"; attribute name = "VerifyBolusLockout"; attribute methodKind = VerificationMethodKind::test; attribute acceptanceCriteria = "No patient bolus initiated when lockout or max bolus constraints active"; attribute status = "planned"; }
                part vcSameStepAlarm : VerificationCase { attribute id = "VER-003"; attribute name = "VerifySameStepAlarmStop"; attribute methodKind = VerificationMethodKind::modelChecking; attribute acceptanceCriteria = "Alarm output affects infusion in same execution step"; attribute status = "planned"; }
                part vcTemporalModeSafety : VerificationCase { attribute id = "VER-004"; attribute name = "VerifyTemporalModeSafety"; attribute methodKind = VerificationMethodKind::modelChecking; attribute acceptanceCriteria = "No invalid transitions and pause on critical alarms"; attribute status = "planned"; }
                part testReportLockout : TestArtifact { attribute id = "TEST-001"; attribute name = "BolusLockoutTestReport"; attribute version = "0.1"; attribute lifecycleState = LifecycleStateKind::development; attribute artifactKind = ArtifactKind::testReport; attribute resultSummary = "planned"; }
                part evidenceLockout : Evidence { attribute id = "EVD-001"; attribute name = "BolusLockoutEvidence"; attribute version = "0.1"; attribute lifecycleState = LifecycleStateKind::development; attribute evidenceType = "verification evidence"; attribute integrityStatus = "draft"; }
                part evidenceModeRange : Evidence { attribute id = "EVD-002"; attribute name = "ModeRangeEvidence"; attribute version = "0.1"; attribute lifecycleState = LifecycleStateKind::development; attribute evidenceType = "formal proof evidence"; attribute integrityStatus = "draft"; }
                part evidenceSameStepAlarm : Evidence { attribute id = "EVD-003"; attribute name = "SameStepAlarmEvidence"; attribute version = "0.1"; attribute lifecycleState = LifecycleStateKind::development; attribute evidenceType = "model checking evidence"; attribute integrityStatus = "draft"; }
                part evidenceTemporalModeSafety : Evidence { attribute id = "EVD-004"; attribute name = "TemporalModeSafetyEvidence"; attribute version = "0.1"; attribute lifecycleState = LifecycleStateKind::development; attribute evidenceType = "model checking evidence"; attribute integrityStatus = "draft"; }
            }
        }
    }
}
