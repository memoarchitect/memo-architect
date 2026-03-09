// ============================================================================
// MEMO Ontology — Physical Architecture Domain
// Hardware, Electrical, Mechanical — inheritance hierarchy mirrors
// physical component taxonomy.
// ============================================================================

package MEMO_Ontology_Physical {

    // ═══════════════════════════════════════════════════════════════════════
    // 6. PHYSICAL ARCHITECTURE — Hardware, Electrical, Mechanical
    //    Inheritance hierarchy mirrors physical component taxonomy.
    // ═══════════════════════════════════════════════════════════════════════

    part def PhysicalComponent {
        doc /* A tangible, manufactured component. */
        attribute name : String;
        attribute complexity : String;
        attribute cost : String;
        attribute leadTime : String;
        attribute manufacturer : String;
        attribute level : String;
        attribute reliability : String;
        attribute weight : String;
    }

    part def ElectricalComponent :> PhysicalComponent {
        doc /* An electrical/electronic component — PCB, sensor, actuator. */
        attribute powerRating : String;
        attribute voltageRating : String;
    }

    part def MechanicalComponent :> PhysicalComponent {
        doc /* A mechanical component — housing, bracket, linkage. */
    }

    part def Catheter :> ElectricalComponent {
        doc /* A medical catheter (domain-specific physical component). */
        attribute isAblation : Boolean;
        attribute isDiagnostic : Boolean;
    }

    part def PhysicalModule {
        doc /* A physical module grouping — board, assembly, enclosure. */
        attribute name : String;
        attribute level : String;
    }

    part def HardwareNode :> PhysicalComponent {
        doc /* A computing/processing node deployed on hardware. */
        attribute ip : String;
    }

    part def ComputingDevice :> HardwareNode {
        doc /* A general computing device. */
        attribute numberOfCores : Integer;
        attribute processingSpeed : Integer;
        attribute ram : Integer;
        attribute storage : Integer;
    }

    part def FPGA :> ComputingDevice {
        doc /* Field-Programmable Gate Array. */
    }

    part def DesktopComputer :> ComputingDevice {
        doc /* Desktop/workstation computer. */
    }

    part def Microcontroller :> ComputingDevice {
        doc /* Embedded microcontroller. */
    }

    part def SingleBoardComputer :> ComputingDevice {
        doc /* Single-board computer (Raspberry Pi, BeagleBone, etc.). */
    }
}
