package MEMO_Extension_Medical_Safety_Relationships {

    connection def Preserves {
        end function : SafetyFunction [1];
        end performance : EssentialPerformance [1];
    }

    connection def SupportsOperatingFunction {
        end performance : EssentialPerformance [1];
        end function : PrimaryOperatingFunction [1];
    }

    connection def DefinesLossCondition {
        end performance : EssentialPerformance [1];
        end condition : EssentialPerformanceLossCondition [1];
    }

    connection def ProtectsEssentialPerformance {
        end control : RiskControl [1];
        end performance : EssentialPerformance [1];
    }
}
