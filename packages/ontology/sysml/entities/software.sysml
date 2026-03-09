// ============================================================================
// MEMO Ontology — Software Architecture Domain
// Software hierarchy — deployable units and ROS integration.
// ============================================================================

package MEMO_Ontology_Software {

    // ═══════════════════════════════════════════════════════════════════════
    // 7. SOFTWARE ARCHITECTURE — Software hierarchy
    // ═══════════════════════════════════════════════════════════════════════

    part def Software {
        doc /* Base software element — deployable unit. */
        attribute name : String;
        attribute groupName : String;
        attribute level : String;
        attribute license : String;
        attribute softwareManufacturer : String;
        attribute safetyClassification : String;
        attribute shortName : String;
    }

    part def SoftwareComponent :> Software {
        doc /* A decomposable software component. */
    }

    part def SoftwareModule :> Software {
        doc /* A software module — logical grouping of source files. */
    }

    part def Firmware :> Software {
        doc /* Embedded firmware. */
    }

    part def Docker :> Software {
        doc /* A containerized deployment unit. */
    }

    part def OperatingSystem :> Software {
        doc /* An operating system. */
    }

    // ROS integration
    part def RosNode :> SoftwareComponent {
        doc /* A ROS node — the fundamental compute unit in ROS. */
        attribute launchFile : String;
        attribute sourceFile : String;
        attribute publications : String;
        attribute subscriptions : String;
        attribute services : String;
    }
}
