package memo {
    package examples {
        package gpca {
            package behavior_subsystems {
                private import memo::architecture::functions::*;
                part fnMonitorAlarm : LogicalFunction { attribute id = "FUNC-003"; attribute name = "MonitorExceptionalConditions"; attribute functionCategory = "alarm"; attribute outputSummary = "Alarm outputs and inhibition conditions"; attribute concernKind = ConcernKind::safety; attribute criticality = CriticalityKind::catastrophic; }
                part fnManageInfusion : LogicalFunction { attribute id = "FUNC-005"; attribute name = "ManageInfusion"; attribute functionCategory = "infusion"; attribute outputSummary = "Commanded flow and mode transitions"; attribute concernKind = ConcernKind::safety; attribute criticality = CriticalityKind::catastrophic; }
            }
        }
    }
}
