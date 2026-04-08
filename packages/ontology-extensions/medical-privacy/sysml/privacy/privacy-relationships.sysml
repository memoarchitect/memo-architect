package MEMO_Extension_Medical_Privacy_Relationships {

    connection def ClassifiesData {
        end classification : PersonalDataCategory [1];
        end subject[1];
    }

    connection def ProcessesData {
        end activity : DataProcessingActivity [1];
        end subject[1];
    }

    connection def ProvidesPrivacyNotice {
        end subject[1];
        end notice : PrivacyNotice [1];
    }

    connection def AssessesPrivacyImpact {
        end assessment : PrivacyImpactAssessment [1];
        end subject[1];
    }

    connection def RespondsToDataSubjectRequest {
        end request : DataSubjectRequest [1];
        end subject[1];
    }
}
