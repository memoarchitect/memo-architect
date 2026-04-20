// ============================================================================
// MEMO Medical — Connected / IoT Medical Device Starter Template
// CoSMA-layered elements: purpose | requirements | risk | functional |
//   logical | physical | software | interfaces | verification
//
// Archetype: Connected infusion pump, remote patient monitoring, wearable
//   biosensor, smart inhaler, implant with telemetry
// ============================================================================

package ConnectedDevice {
    import MEMO_Ontology_MedicalProcess::*;

    // ═══════════════════════════════════════════════════════════════════════
    // PURPOSE LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part clinician : Actor {
        attribute redefines name = "Clinician";
        doc /* Receives remote data, sets therapy parameters, reviews alerts. */
    }

    part patient : Actor {
        attribute redefines name = "Patient";
        doc /* Wears or uses the device. May interact via companion app. */
    }

    part careTeam : Stakeholder {
        attribute redefines name = "Care Team";
    }

    part regulatoryBody : Stakeholder {
        attribute redefines name = "Regulatory Body (FDA / Notified Body)";
        doc /* Requires cybersecurity evidence per FDA guidance and IEC 62304. */
    }

    action intendedUse : UseCase {
        attribute redefines name = "Intended Use";
        doc /* The device is intended to [monitor / deliver / sense] for patients with [condition] managed remotely by [care setting]. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REQUIREMENTS LAYER
    // ═══════════════════════════════════════════════════════════════════════

    requirement unReliableData : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Reliable Remote Data Transmission";
        doc /* Clinicians need to receive patient data reliably even with intermittent connectivity. */
    }

    requirement unSecure : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Secure Communication";
        doc /* Patient data must be protected during wireless transmission. */
    }

    requirement unAlerts : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Timely Alerts for Abnormal Values";
        doc /* Care team shall receive alerts within defined time when values are out of range. */
    }

    requirement srDataLatency : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "Data Transmission Latency ≤ 30 seconds";
        doc /* Sensor readings shall be transmitted and acknowledged within 30 seconds of measurement. */
    }

    requirement srEncryption : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "End-to-End Encryption";
        doc /* All data transmitted over wireless shall use TLS 1.3 or equivalent. */
    }

    requirement srAlertDelivery : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "Alert Delivery within 60 seconds";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RISK LAYER — ISO 14971 + Cybersecurity
    // ═══════════════════════════════════════════════════════════════════════

    requirement hazDataLoss : Hazard {
        attribute redefines title = "Loss of Patient Data During Transmission";
    }

    requirement hazCyberAttack : Hazard {
        attribute redefines title = "Unauthorized Remote Device Access";
        doc /* Attacker gains control of device parameters via network. */
    }

    requirement hazMissedAlert : Hazard {
        attribute redefines title = "Critical Alert Not Delivered";
    }

    requirement hsClinicalMiss : HazardousSituation {
        attribute redefines title = "Clinician Misses Critical Event";
        doc /* Delayed or missing alert causes delayed clinical response. */
    }

    requirement harmPatientHarm : Harm {
        attribute redefines title = "Patient Harm from Delayed Response";
    }

    requirement rcEncryptedComms : RiskControl {
        attribute redefines title = "End-to-End Encrypted Communication";
        doc /* TLS 1.3 for all cloud transmission; local BLE encrypted. */
    }

    requirement rcRedundantAlert : RiskControl {
        attribute redefines title = "Redundant Alert Delivery (SMS + App Push)";
    }

    requirement rcAuthControl : RiskControl {
        attribute redefines title = "Strong Authentication for Remote Access";
        doc /* MFA required for all remote configuration changes. */
    }

    connection : Mitigates connect control :>> rcEncryptedComms to hazard :>> hazCyberAttack;
    connection : Mitigates connect control :>> rcRedundantAlert to hazard :>> hazMissedAlert;
    connection : Mitigates connect control :>> rcAuthControl to hazard :>> hazCyberAttack;
    connection : Causes connect hazard :>> hazMissedAlert to hs :>> hsClinicalMiss;

    // ═══════════════════════════════════════════════════════════════════════
    // FUNCTIONAL LAYER
    // ═══════════════════════════════════════════════════════════════════════

    action funcSense : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Sense Patient Parameter";
    }

    action funcTransmit : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Transmit Data to Cloud";
    }

    action funcAlert : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Generate and Deliver Alert";
    }

    action funcRemoteConfig : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Accept Remote Configuration";
        doc /* Clinician sets parameters via cloud portal; device applies after authentication. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGICAL / PHYSICAL LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part deviceSystem : System {
        attribute redefines name = "Connected Device System";
    }

    part onDeviceFirmware : SoftwareComponent {
        attribute redefines name = "On-Device Firmware";
    }

    part cloudBackend : SoftwareComponent {
        attribute redefines name = "Cloud Backend Service";
    }

    part companionApp : SoftwareComponent {
        attribute redefines name = "Companion Mobile App";
    }

    part wirelessModule : LogicalComponent {
        attribute redefines name = "Wireless Communication Module";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERFACE LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part cloudApi : Interface {
        attribute redefines name = "Device-to-Cloud API";
        doc /* REST or MQTT over TLS 1.3. */
    }

    part bleInterface : Interface {
        attribute redefines name = "BLE Interface to Companion App";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICATION LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part testLatency : Test {
        attribute redefines name = "Data Transmission Latency Test";
        doc /* Measure round-trip time under nominal and degraded network conditions. */
    }

    part testCyberPen : Test {
        attribute redefines name = "Penetration Test — Unauthorized Access";
        doc /* Third-party cybersecurity assessment per FDA cyber guidance. */
    }

    part testAlertDelivery : Test {
        attribute redefines name = "Alert Delivery Time Test";
    }
}
