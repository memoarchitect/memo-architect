// ============================================================================
// GPCA Infusion Pump — Cybersecurity & Interoperability (M88)
// ≥8 cybersecurity elements: ThreatModel, Vulnerabilities, Controls, SBOM
// ============================================================================

package GPCA_Cybersecurity {
    import MEMO_Ontology_Arch::*;
    import MEMO_Ontology_Process::*;
    import GPCA_Requirements::*;
    import GPCA_Risk::*;
    import GPCA_Architecture::*;

    // ═══════════════════════════════════════════════════════════════════════
    // THREAT MODEL
    // ═══════════════════════════════════════════════════════════════════════

    part threatModelGPCA : ThreatModel {
        attribute redefines name = "GPCA Cybersecurity Threat Model";
        doc /* Threat model per FDA premarket cybersecurity guidance and
             * IEC 81001-5-1. Covers network-connected hospital environment,
             * physical access threats, and supply chain risks. */
    }

    requirement threatNetworkAttack : ThreatScenario {
        attribute redefines reqId = "TS-001";
        attribute redefines title = "Hospital Network Attack";
        doc /* Attacker on hospital network exploits pharmacy DB interface
             * to modify drug library data or inject false drug responses,
             * leading to incorrect dose calculations. STRIDE: Tampering. */
    }

    requirement threatPhysicalTampering : ThreatScenario {
        attribute redefines reqId = "TS-002";
        attribute redefines title = "Physical Tampering";
        doc /* Unauthorized individual with physical access to pump modifies
             * configuration or connects unauthorized device to USB port.
             * STRIDE: Tampering, Elevation of Privilege. */
    }

    requirement threatWirelessInterception : ThreatScenario {
        attribute redefines reqId = "TS-003";
        attribute redefines title = "Wireless Network Interception";
        doc /* Attacker intercepts unencrypted traffic between pump and
             * pharmacy database to capture patient data or modify commands.
             * STRIDE: Information Disclosure, Tampering. */
    }

    requirement threatMaliciousFirmware : ThreatScenario {
        attribute redefines reqId = "TS-004";
        attribute redefines title = "Malicious Firmware Update";
        doc /* Compromised update mechanism delivers malicious firmware
             * that modifies safety-critical control algorithms.
             * STRIDE: Tampering, Elevation of Privilege. */
    }

    requirement threatDenialOfService : ThreatScenario {
        attribute redefines reqId = "TS-005";
        attribute redefines title = "Denial of Service on Network Interface";
        doc /* Network flood attack prevents pump from accessing pharmacy
             * database, forcing fallback to local cache which may be stale.
             * STRIDE: Denial of Service. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VULNERABILITIES
    // ═══════════════════════════════════════════════════════════════════════

    requirement vulnUnencryptedDB : Vulnerability {
        attribute redefines reqId = "VULN-001";
        attribute redefines title = "Unencrypted Pharmacy DB Connection (if TLS disabled)";
        doc /* If TLS is misconfigured or disabled, pharmacy database queries
             * transmit drug data and patient identifiers in cleartext. */
    }

    requirement vulnDefaultCredentials : Vulnerability {
        attribute redefines reqId = "VULN-002";
        attribute redefines title = "Default Service Credentials";
        doc /* Factory default service account credentials (biomed access)
             * if not changed during deployment. */
    }

    requirement vulnUSBAutorun : Vulnerability {
        attribute redefines reqId = "VULN-003";
        attribute redefines title = "USB Port Auto-Execution";
        doc /* USB port accepts firmware updates without cryptographic
             * signature verification (if signing is disabled). */
    }

    requirement vulnSOUPCVE : Vulnerability {
        attribute redefines reqId = "VULN-004";
        attribute redefines title = "Known SOUP Component CVEs";
        doc /* Unpatched vulnerabilities in SOUP components (lwIP, mbedTLS)
             * that could be exploited for remote code execution. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CYBERSECURITY REQUIREMENTS
    // ═══════════════════════════════════════════════════════════════════════

    requirement csReqEncryptedComm : Requirement {
        attribute redefines category = RequirementCategory::Security;
        attribute redefines reqId = "CS-REQ-001";
        attribute redefines title = "Encrypted Network Communication";
        doc /* All network communication shall use TLS 1.3 with mutual
             * authentication. Fallback to unencrypted mode shall be
             * prohibited in production builds. */
    }

    requirement csReqAuthentication : Requirement {
        attribute redefines category = RequirementCategory::Security;
        attribute redefines topic = "Authentication";
        attribute redefines reqId = "CS-REQ-002";
        attribute redefines title = "Multi-Factor Authentication";
        doc /* Clinical configuration access shall require two-factor
             * authentication (badge + PIN). Service access shall require
             * unique per-device credentials changed at deployment. */
    }

    requirement csReqAuditLog : Requirement {
        attribute redefines category = RequirementCategory::Security;
        attribute redefines topic = "AuditLog";
        attribute redefines reqId = "CS-REQ-003";
        attribute redefines title = "Cybersecurity Audit Log";
        doc /* All authentication attempts, configuration changes, network
             * connections, and firmware updates shall be logged in a
             * tamper-evident audit trail with timestamps. */
    }

    requirement csReqSecureBoot : Requirement {
        attribute redefines category = RequirementCategory::Security;
        attribute redefines reqId = "CS-REQ-004";
        attribute redefines title = "Secure Boot Chain";
        doc /* Firmware shall be cryptographically signed. Boot loader
             * shall verify signature before execution. Unsigned or
             * modified firmware shall be rejected. */
    }

    requirement csReqPatchManagement : Requirement {
        attribute redefines category = RequirementCategory::Security;
        attribute redefines reqId = "CS-REQ-005";
        attribute redefines title = "SOUP Patch Management";
        doc /* SOUP component vulnerabilities shall be monitored via
             * CVE feeds. Critical patches shall be evaluated and deployed
             * within 30 days of disclosure. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECURITY CONTROLS
    // ═══════════════════════════════════════════════════════════════════════

    requirement scTLS : SecurityControl {
        attribute redefines reqId = "SC-001";
        attribute redefines title = "TLS 1.3 Encryption";
        doc /* mbedTLS implementation with certificate pinning for
             * pharmacy database connection. Cipher: AES-256-GCM. */
    }

    requirement scSessionTimeout : SecurityControl {
        attribute redefines reqId = "SC-002";
        attribute redefines title = "Automatic Session Timeout";
        doc /* Clinical sessions auto-expire after 5 minutes inactivity.
             * Service sessions after 15 minutes. Re-authentication required. */
    }

    requirement scRBAC : SecurityControl {
        attribute redefines reqId = "SC-003";
        attribute redefines title = "Role-Based Access Control";
        doc /* Three roles: patient (bolus only), clinician (all clinical),
             * biomed (service/maintenance). Hardware-enforced role separation. */
    }

    requirement scSecureBoot : SecurityControl {
        attribute redefines reqId = "SC-004";
        attribute redefines title = "Signed Firmware Verification";
        doc /* RSA-2048 firmware signature verified by hardware root of trust
             * before boot. Tamper-resistant secure element stores keys. */
    }

    requirement scUSBRestriction : SecurityControl {
        attribute redefines reqId = "SC-005";
        attribute redefines title = "USB Port Access Restriction";
        doc /* USB port disabled during normal operation. Requires biomed
             * authentication to enable for log export or firmware update. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SBOM — Software Bill of Materials
    // ═══════════════════════════════════════════════════════════════════════

    part sbomGPCA : SBOMArtifact {
        attribute redefines name = "GPCA Software Bill of Materials";
        doc /* SBOM per FDA cybersecurity guidance and NTIA minimum elements.
             * Components: FreeRTOS v10.5.1, lwIP v2.2.0, LVGL v8.3,
             * mbedTLS v3.4.0, FHIR Client v1.2.0, LittleFS v2.5.1.
             * Format: SPDX 2.3. Updated with each firmware release.
             * Monitored against NVD for new CVE disclosures. */
    }

    part secureUpdateCapability : SecureUpdateCapability {
        attribute redefines name = "GPCA Secure Firmware Update";
        doc /* Over-the-network firmware update via hospital IT managed
             * update server. Signed package with rollback capability.
             * Requires biomed authentication to initiate. Update does
             * not interrupt active infusion — scheduled during IDLE. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CYBER ASSET IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════════

    part assetMainFirmware : CyberAsset {
        attribute redefines name = "Main Processor Firmware";
        doc /* Critical asset: ARM Cortex-M7 firmware image containing
             * all safety-critical control algorithms. */
    }

    part assetSafetyFirmware : CyberAsset {
        attribute redefines name = "Safety Co-Processor Firmware";
        doc /* Critical asset: Independent watchdog and valve control
             * firmware on ARM Cortex-M0. */
    }

    part assetDrugLibraryCache : CyberAsset {
        attribute redefines name = "Local Drug Library Cache";
        doc /* Cached copy of pharmacy drug database used when network
             * unavailable. Must be integrity-protected. */
    }

    part assetPatientData : CyberAsset {
        attribute redefines name = "Patient Event Log Data";
        doc /* Contains patient-identifiable infusion records.
             * PHI requiring HIPAA-compliant protection. */
    }

    part assetCertificateStore : CyberAsset {
        attribute redefines name = "TLS Certificate Store";
        doc /* Device certificate and CA root certificates for mutual
             * TLS authentication. Stored in secure element. */
    }

    // Threat → Asset connections
    connection : ThreatensAsset connect threat ::> threatNetworkAttack to asset ::> assetDrugLibraryCache;
    connection : ThreatensAsset connect threat ::> threatPhysicalTampering to asset ::> assetMainFirmware;
    connection : ThreatensAsset connect threat ::> threatWirelessInterception to asset ::> assetPatientData;
    connection : ThreatensAsset connect threat ::> threatMaliciousFirmware to asset ::> assetMainFirmware;
    connection : ThreatensAsset connect threat ::> threatMaliciousFirmware to asset ::> assetSafetyFirmware;
    connection : ThreatensAsset connect threat ::> threatDenialOfService to asset ::> assetDrugLibraryCache;

    // Vulnerability exploitation
    connection : ExploitsVulnerability connect threat ::> threatWirelessInterception to vulnerability ::> vulnUnencryptedDB;
    connection : ExploitsVulnerability connect threat ::> threatPhysicalTampering to vulnerability ::> vulnDefaultCredentials;
    connection : ExploitsVulnerability connect threat ::> threatMaliciousFirmware to vulnerability ::> vulnUSBAutorun;
    connection : ExploitsVulnerability connect threat ::> threatNetworkAttack to vulnerability ::> vulnSOUPCVE;

    // Control → Threat mitigation
    connection : MitigatesThreat connect control ::> scTLS to threat ::> threatWirelessInterception;
    connection : MitigatesThreat connect control ::> scTLS to threat ::> threatNetworkAttack;
    connection : MitigatesThreat connect control ::> scSessionTimeout to threat ::> threatPhysicalTampering;
    connection : MitigatesThreat connect control ::> scRBAC to threat ::> threatPhysicalTampering;
    connection : MitigatesThreat connect control ::> scSecureBoot to threat ::> threatMaliciousFirmware;
    connection : MitigatesThreat connect control ::> scUSBRestriction to threat ::> threatPhysicalTampering;
    connection : MitigatesThreat connect control ::> scUSBRestriction to threat ::> threatMaliciousFirmware;

    // Security control → Interface
    connection : SecuresInterface connect control ::> scTLS to protectedInterface ::> PharmacyDatabaseInterface;

    // SBOM maintenance
    connection : MaintainsSbom connect subject ::> gpcaSoftware to sbom ::> sbomGPCA;
    connection : SupportsSecureUpdate connect subject ::> gpcaSoftware to capability ::> secureUpdateCapability;

    // Threat model scope
    connection : ModelsThreat connect model ::> threatModelGPCA to threat ::> threatNetworkAttack;
    connection : ModelsThreat connect model ::> threatModelGPCA to threat ::> threatPhysicalTampering;
    connection : ModelsThreat connect model ::> threatModelGPCA to threat ::> threatWirelessInterception;
    connection : ModelsThreat connect model ::> threatModelGPCA to threat ::> threatMaliciousFirmware;
    connection : ModelsThreat connect model ::> threatModelGPCA to threat ::> threatDenialOfService;
}
