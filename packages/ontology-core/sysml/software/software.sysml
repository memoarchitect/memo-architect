package MEMO_Ontology_Core_Software {

    // Every software element shares identity/version metadata.
    part def SoftwareElement {
        attribute name : String;
        attribute version : String;
        attribute supplier : String;
        attribute safetyClassification : String;
    }

    // Compatibility alias during Session 1 migration.
    part def Software :> SoftwareElement { }

    // SEI ADD/SAM: deployable implementation element.
    // AADL analogue: thread group/process implementation boundary.
    part def SoftwareComponent :> SoftwareElement {
        attribute componentType : String;   // e.g. "process", "container", "task"
    }

    // SEI SAM/CBAM: module-level decomposition unit.
    // AADL analogue: package/subprogram grouping.
    part def SoftwareModule :> SoftwareElement {
        attribute moduleType : String;      // e.g. "library", "package", "subsystem"
    }

    // SEI ADD: architectural layer/tier.
    part def SoftwareLayer :> SoftwareElement {
        attribute layerRole : String;       // e.g. "presentation", "domain", "infrastructure"
    }

    // SEI SAM: top-level assembled software product.
    // AADL analogue: complete software system package.
    part def SoftwareSystem :> SoftwareElement {
        attribute runtimeTarget : String;
    }

    // AADL analogue: thread/subprogram execution context.
    part def SoftwareThread :> SoftwareElement {
        attribute schedulingPolicy : String;
        attribute period : String;
    }

    // AADL analogue: data component/storage resource.
    part def SoftwareDataStore :> SoftwareElement {
        attribute storageType : String;
        attribute consistencyModel : String;
    }

    // SEI/AADL: explicit connector/channel between elements.
    part def SoftwareConnector :> SoftwareElement {
        attribute connectorType : String;
        attribute protocol : String;
    }

    // Firmware remains a software component coupled to hardware resources.
    part def Firmware :> SoftwareComponent {
        attribute targetHardware : String;
    }
}
