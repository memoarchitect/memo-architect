package MEMO_Ontology_Core_Software {

    // ─── Root abstract ────────────────────────────────────────────────────────
    // Every software artefact has identity, version, and a supplier.
    // safetyClassification is a free string so non-medical projects can use
    // domain-specific schemes (e.g. SIL, DAL, ASIL) without coupling.
    part def Software {
        attribute name : String;
        attribute version : String;
        attribute supplier : String;
        attribute safetyClassification : String;
    }

    // ─── Structural software kinds (SEI Software Architecture vocabulary) ─────

    // A deployable runtime unit — a process, OS service, container, or embedded
    // task that executes independently.  In ROS this maps directly to a RosNode.
    // In IEC 62304 this is the boundary for software safety class assignment.
    part def SoftwareComponent :> Software {
        attribute componentType : String;   // e.g. "process", "container", "task"
    }

    // A cohesive collection of SoftwareComponents and/or sub-modules that are
    // developed, tested, and released together — the SysML v2 analog of an SEI
    // "software module" (CBAM / SAM).  IEC 62304 SoftwareItem specialises here.
    part def SoftwareModule :> Software {
        attribute moduleType : String;      // e.g. "library", "package", "subsystem"
    }

    // An architectural tier grouping modules by responsibility — used in SEI ADD
    // views (presentation, business-logic, data-access, infrastructure).
    part def SoftwareLayer :> Software {
        attribute layerRole : String;       // e.g. "presentation", "domain", "infrastructure"
    }

    // Firmware is software tightly coupled to hardware; it is a SoftwareComponent
    // with a direct dependency on specific hardware resources.
    part def Firmware :> SoftwareComponent {
        attribute targetHardware : String;
    }
}
