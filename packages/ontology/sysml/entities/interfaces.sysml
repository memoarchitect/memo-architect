// ============================================================================
// MEMO Ontology — Interfaces & Ports Domain
// Connection points and behavioral contracts.
// ============================================================================

package MEMO_Ontology_Interfaces {

    // ═══════════════════════════════════════════════════════════════════════
    // 8. INTERFACES & PORTS — Connection points and contracts
    // ═══════════════════════════════════════════════════════════════════════

    port def Port {
        doc /* Base port — a physical or logical connection point. */
    }

    port def PortEthernet :> Port { }
    port def PortUSB :> Port { }
    port def PortSerial :> Port { }
    port def PortPower :> Port { }
    port def PortCustom :> Port { }
    port def ParallelPort :> Port { }

    interface def Interface {
        doc /* Base interface — a behavioral contract. */
    }

    interface def SoftwareInterface :> Interface {
        doc /* A software interface contract. */
    }

    interface def SoftwareProvidedInterface :> Interface {
        doc /* An interface a component provides (server side). */
    }

    interface def SoftwareRequiredInterface :> Interface {
        doc /* An interface a component consumes (client side). */
    }

    // ROS interfaces
    interface def RosTopic :> SoftwareInterface {
        doc /* A ROS topic — publish/subscribe channel. */
    }

    interface def RosService :> SoftwareInterface {
        doc /* A ROS service — request/response contract. */
    }

    interface def RosPublication :> SoftwareProvidedInterface { }
    interface def RosSubscription :> SoftwareRequiredInterface { }
    interface def RosServiceCall :> SoftwareProvidedInterface { }
}
