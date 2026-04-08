package MEMO_Extension_Medical_Operations {

    action def ManufacturingProcedure :> Procedure { }

    action def InstallationProcedure :> Procedure { }

    action def ServiceProcedure :> Procedure { }

    action def PreventiveMaintenanceProcedure :> ServiceProcedure { }

    action def CalibrationProcedure :> ServiceProcedure { }

    part def ManufacturingRecord :> QMSRecord { }

    part def InstallationQualification :> ComplianceEvidence { }

    part def ServiceReport :> QMSRecord { }

    part def CalibrationRecord :> ComplianceEvidence { }
}
