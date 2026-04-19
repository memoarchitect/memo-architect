package MEMO_Ontology_Medical_Ops_Relationships {

    connection def ManufacturesSubject {
        end procedure : ManufacturingProcedure [1];
        end subject [1];
    }

    connection def InstallsSubject {
        end procedure : InstallationProcedure [1];
        end subject [1];
    }

    connection def ServicesSubject {
        end procedure : ServiceProcedure [1];
        end subject [1];
    }

    connection def MaintainsSubject {
        end procedure : PreventiveMaintenanceProcedure [1];
        end subject [1];
    }

    connection def CalibratesSubject {
        end procedure : CalibrationProcedure [1];
        end subject [1];
    }

    connection def QualifiesInstallation {
        end qualification : InstallationQualification [1];
        end subject [1];
    }
}
