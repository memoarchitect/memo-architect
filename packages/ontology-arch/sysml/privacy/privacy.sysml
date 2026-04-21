package MEMO_Ontology_Arch_Privacy {

    part def DataCategory {
        attribute categoryId : String;
        attribute name : String;
        attribute sensitivity : String;
        attribute regulatoryBasis : String;
    }

    part def DataSubjectCategory {
        attribute categoryId : String;
        attribute name : String;
        attribute vulnerabilityLevel : String;
    }

    part def ProcessingActivity {
        attribute activityId : String;
        attribute name : String;
        attribute purpose : String;
        attribute legalBasis : String;
        attribute crossBorderTransfer : Boolean;
    }

    part def RetentionRule {
        attribute ruleId : String;
        attribute retentionPeriod : String;
        attribute disposalMethod : String;
        attribute regulatoryBasis : String;
    }

    part def PrivacyRiskScenario {
        attribute scenarioId : String;
        attribute title : String;
        attribute likelihood : String;
        attribute impact : String;
        attribute residualRisk : String;
    }
}
