package IrrigationPump_Risk {
    import MEMO_Ontology_Medical::*;

    requirement hazOverpressure : Hazard {
        attribute redefines hazardId = "HAZ-IRR-001";
        attribute redefines title = "Excessive Irrigation Pressure";
    }

    requirement hazAirInLine : Hazard {
        attribute redefines hazardId = "HAZ-IRR-002";
        attribute redefines title = "Air Introduced Into Irrigation Path";
    }

    requirement hazLossOfIrrigation : Hazard {
        attribute redefines hazardId = "HAZ-IRR-003";
        attribute redefines title = "Loss of Irrigation Delivery";
    }

    requirement hsJointOverdistension : HazardousSituation {
        attribute redefines hsId = "HS-IRR-001";
        attribute redefines title = "Joint space is exposed to excessive irrigation pressure";
    }

    requirement hsUnprimedFluidPath : HazardousSituation {
        attribute redefines hsId = "HS-IRR-002";
        attribute redefines title = "Unprimed cassette delivers air into the surgical field";
    }

    requirement hsCollapsedField : HazardousSituation {
        attribute redefines hsId = "HS-IRR-003";
        attribute redefines title = "Reservoir depletion collapses irrigation pressure during the procedure";
    }

    requirement harmTissueExtravasation : Harm {
        attribute redefines harmId = "HARM-IRR-001";
        attribute redefines title = "Tissue extravasation from excessive pressure";
        attribute redefines severity = SeverityLevel::Serious;
    }

    requirement harmAirEmbolicComplication : Harm {
        attribute redefines harmId = "HARM-IRR-002";
        attribute redefines title = "Complication from air introduced into the fluid path";
        attribute redefines severity = SeverityLevel::Critical;
    }

    requirement harmLossOfVisualization : Harm {
        attribute redefines harmId = "HARM-IRR-003";
        attribute redefines title = "Loss of visualization requiring procedure interruption";
        attribute redefines severity = SeverityLevel::Serious;
    }

    requirement riskPressureInjury : Risk {
        attribute redefines riskId = "RISK-IRR-001";
        attribute redefines title = "Pressure-induced injury risk assessment";
        attribute redefines severityPost = SeverityLevel::Serious;
        attribute redefines probabilityPost = ProbabilityLevel::Remote;
    }

    requirement rcPressureLimiter : RiskControl {
        attribute redefines rcId = "RC-IRR-001";
        attribute redefines title = "Pressure Limiter";
    }

    requirement rcPrimeCompletionInterlock : RiskControl {
        attribute redefines rcId = "RC-IRR-002";
        attribute redefines title = "Prime Completion Interlock";
    }

    requirement rcReservoirLowAlarm : RiskControl {
        attribute redefines rcId = "RC-IRR-003";
        attribute redefines title = "Reservoir Low Alarm";
    }

    connection : Mitigates connect control ::> rcPressureLimiter to hazard ::> hazOverpressure;
    connection : Mitigates connect control ::> rcPrimeCompletionInterlock to hazard ::> hazAirInLine;
    connection : Mitigates connect control ::> rcReservoirLowAlarm to hazard ::> hazLossOfIrrigation;

    connection : Causes connect hazard ::> hazOverpressure to situation ::> hsJointOverdistension;
    connection : Causes connect hazard ::> hazAirInLine to situation ::> hsUnprimedFluidPath;
    connection : Causes connect hazard ::> hazLossOfIrrigation to situation ::> hsCollapsedField;

    connection : LeadsTo connect situation ::> hsJointOverdistension to harm ::> harmTissueExtravasation;
    connection : LeadsTo connect situation ::> hsUnprimedFluidPath to harm ::> harmAirEmbolicComplication;
    connection : LeadsTo connect situation ::> hsCollapsedField to harm ::> harmLossOfVisualization;

    connection : Identifies connect risk ::> riskPressureInjury to hazard ::> hazOverpressure;
}
