// ============================================================================
// GPCA Infusion Pump — Software Architecture (M86)
// IEC 62304 Class C Compliance
// Software System → Software Items (≥8) → Software Units (≥15)
// SOUP Items (≥5), Verification Test Cases (≥20)
// ============================================================================

package GPCA_Architecture {
    import MEMO_Ontology_Medical::*;
    import GPCA_Requirements::*;
    import GPCA_Risk::*;

    // ═══════════════════════════════════════════════════════════════════════
    // SYSTEM-LEVEL ARCHITECTURE
    // ═══════════════════════════════════════════════════════════════════════

    part gpcaSystem : System {
        attribute redefines name = "GPCA Infusion Pump System";
        doc /* Top-level system boundary for the Generic Patient Controlled
             * Analgesia infusion pump. IEC 62304 Class C. */
    }

    part controlSubsystem : Subsystem {
        attribute redefines name = "Control Electronics Subsystem";
    }

    part fluidicsSubsystem : Subsystem {
        attribute redefines name = "Fluidics & Pump Mechanism Subsystem";
    }

    part sensorSubsystem : Subsystem {
        attribute redefines name = "Sensor Array Subsystem";
    }

    part uiSubsystem : Subsystem {
        attribute redefines name = "User Interface Subsystem";
    }

    part powerSubsystem : Subsystem {
        attribute redefines name = "Power Management Subsystem";
    }

    part networkSubsystem : Subsystem {
        attribute redefines name = "Network Communication Subsystem";
    }

    // System composition
    connection : ComposedOf connect whole ::> gpcaSystem to part ::> controlSubsystem;
    connection : ComposedOf connect whole ::> gpcaSystem to part ::> fluidicsSubsystem;
    connection : ComposedOf connect whole ::> gpcaSystem to part ::> sensorSubsystem;
    connection : ComposedOf connect whole ::> gpcaSystem to part ::> uiSubsystem;
    connection : ComposedOf connect whole ::> gpcaSystem to part ::> powerSubsystem;
    connection : ComposedOf connect whole ::> gpcaSystem to part ::> networkSubsystem;

    // ═══════════════════════════════════════════════════════════════════════
    // HARDWARE COMPONENTS
    // ═══════════════════════════════════════════════════════════════════════

    part mainProcessor : Microcontroller {
        attribute redefines name = "Main Processor (ARM Cortex-M7)";
        attribute redefines numberOfCores = 1;
        attribute redefines ram = 512;
    }

    part safetyProcessor : Microcontroller {
        attribute redefines name = "Safety Co-Processor (ARM Cortex-M0)";
        attribute redefines numberOfCores = 1;
        attribute redefines ram = 32;
        doc /* Independent safety processor running watchdog and valve control. */
    }

    part peristalticMotor : ElectricalComponent {
        attribute redefines name = "Peristaltic Pump Stepper Motor";
    }

    part flowSensorA : ElectricalComponent {
        attribute redefines name = "Flow Sensor A (Ultrasonic)";
    }

    part flowSensorB : ElectricalComponent {
        attribute redefines name = "Flow Sensor B (Ultrasonic)";
    }

    part pressureSensorUpstream : ElectricalComponent {
        attribute redefines name = "Upstream Pressure Sensor";
    }

    part pressureSensorDownstream : ElectricalComponent {
        attribute redefines name = "Downstream Pressure Sensor";
    }

    part airSensorA : ElectricalComponent {
        attribute redefines name = "Air Bubble Sensor A (Ultrasonic)";
    }

    part airSensorB : ElectricalComponent {
        attribute redefines name = "Air Bubble Sensor B (Ultrasonic)";
    }

    part flowControlValve : MechanicalComponent {
        attribute redefines name = "Normally-Closed Flow Control Valve";
    }

    part antiFreeFlowClamp : MechanicalComponent {
        attribute redefines name = "Anti-Free-Flow Clamp";
    }

    part tftDisplay : ElectricalComponent {
        attribute redefines name = "4.3-inch TFT LCD Display";
    }

    part alarmLED : ElectricalComponent {
        attribute redefines name = "Tri-Color Alarm LED";
    }

    part alarmBuzzer : ElectricalComponent {
        attribute redefines name = "Piezoelectric Alarm Buzzer";
    }

    part bolusButton : MechanicalComponent {
        attribute redefines name = "Patient Bolus Request Button";
    }

    part barcodeScanner : ElectricalComponent {
        attribute redefines name = "2D Barcode/RFID Scanner Module";
    }

    part batteryPack : ElectricalComponent {
        attribute redefines name = "Li-Ion Battery Pack (4-hour)";
    }

    part doorSensor : ElectricalComponent {
        attribute redefines name = "Pump Door Interlock Sensor";
    }

    part temperatureSensor : ElectricalComponent {
        attribute redefines name = "Ambient Temperature Sensor";
    }

    part reservoirSensor : ElectricalComponent {
        attribute redefines name = "Reservoir Level Sensor (Optical)";
    }

    part ethernetPort : PortEthernet {
        attribute redefines name = "Ethernet Port (Hospital Network)";
    }

    part usbPort : PortUSB {
        attribute redefines name = "USB Port (Log Export/Service)";
    }

    // Subsystem composition
    connection : ComposedOf connect whole ::> controlSubsystem to part ::> mainProcessor;
    connection : ComposedOf connect whole ::> controlSubsystem to part ::> safetyProcessor;
    connection : ComposedOf connect whole ::> fluidicsSubsystem to part ::> peristalticMotor;
    connection : ComposedOf connect whole ::> fluidicsSubsystem to part ::> flowControlValve;
    connection : ComposedOf connect whole ::> fluidicsSubsystem to part ::> antiFreeFlowClamp;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> flowSensorA;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> flowSensorB;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> pressureSensorUpstream;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> pressureSensorDownstream;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> airSensorA;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> airSensorB;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> doorSensor;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> temperatureSensor;
    connection : ComposedOf connect whole ::> sensorSubsystem to part ::> reservoirSensor;
    connection : ComposedOf connect whole ::> uiSubsystem to part ::> tftDisplay;
    connection : ComposedOf connect whole ::> uiSubsystem to part ::> alarmLED;
    connection : ComposedOf connect whole ::> uiSubsystem to part ::> alarmBuzzer;
    connection : ComposedOf connect whole ::> uiSubsystem to part ::> bolusButton;
    connection : ComposedOf connect whole ::> uiSubsystem to part ::> barcodeScanner;
    connection : ComposedOf connect whole ::> powerSubsystem to part ::> batteryPack;
    connection : ComposedOf connect whole ::> networkSubsystem to part ::> ethernetPort;
    connection : ComposedOf connect whole ::> networkSubsystem to part ::> usbPort;

    // ═══════════════════════════════════════════════════════════════════════
    // SOFTWARE SYSTEM — IEC 62304 Class C
    // ═══════════════════════════════════════════════════════════════════════

    part gpcaSoftware : SoftwareSystem {
        attribute redefines name = "GPCA Embedded Software";
        attribute redefines safetyClassification = "C";
        doc /* IEC 62304 Class C software system for safety-critical
             * infusion pump control. Runs on ARM Cortex-M7 main processor
             * with RTOS. Safety co-processor runs independent watchdog. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SOFTWARE ITEMS (≥8)
    // ═══════════════════════════════════════════════════════════════════════

    part siInfusionManager : SoftwareItem {
        attribute redefines name = "Infusion Manager";
        attribute redefines safetyClassification = "C";
        doc /* Core infusion control: flow rate regulation, mode management,
             * delivery tracking. Safety-critical. */
    }

    part siAlarmManager : SoftwareItem {
        attribute redefines name = "Alarm Manager";
        attribute redefines safetyClassification = "C";
        doc /* Alarm detection, priority resolution, escalation, and
             * notification output. Safety-critical. */
    }

    part siNotificationController : SoftwareItem {
        attribute redefines name = "Notification Controller";
        attribute redefines safetyClassification = "C";
        doc /* Implements GPCA 20-row notification action table. Maps
             * alarm conditions to inhibit/stop actions. Safety-critical. */
    }

    part siConfigurationManager : SoftwareItem {
        attribute redefines name = "Configuration Manager";
        attribute redefines safetyClassification = "B";
        doc /* Prescription entry, validation, drug library lookup,
             * parameter storage. */
    }

    part siSystemMonitor : SoftwareItem {
        attribute redefines name = "System Monitor";
        attribute redefines safetyClassification = "C";
        doc /* Hardware health monitoring: sensors, battery, temperature,
             * door interlock, self-test. Safety-critical. */
    }

    part siDrugDatabaseInterface : SoftwareItem {
        attribute redefines name = "Drug Database Interface";
        attribute redefines safetyClassification = "B";
        doc /* HL7/FHIR interface to pharmacy database. Drug library
             * query, caching, and fallback. */
    }

    part siLoggingService : SoftwareItem {
        attribute redefines name = "Logging Service";
        attribute redefines safetyClassification = "B";
        doc /* Event logging, non-volatile storage management, log
             * export via USB/network. */
    }

    part siUIController : SoftwareItem {
        attribute redefines name = "User Interface Controller";
        attribute redefines safetyClassification = "B";
        doc /* Display rendering, touch input processing, barcode
             * scanning, LED/buzzer control. */
    }

    part siAuthenticationService : SoftwareItem {
        attribute redefines name = "Authentication Service";
        attribute redefines safetyClassification = "B";
        doc /* Clinician authentication, session management, role-based
             * access control. */
    }

    part siSafetyCoprocessorFirmware : SoftwareItem {
        attribute redefines name = "Safety Co-Processor Firmware";
        attribute redefines safetyClassification = "C";
        doc /* Independent safety firmware on Cortex-M0: hardware watchdog,
             * valve control, emergency shutdown. Safety-critical. */
    }

    // Software system composition
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siInfusionManager;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siAlarmManager;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siNotificationController;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siConfigurationManager;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siSystemMonitor;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siDrugDatabaseInterface;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siLoggingService;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siUIController;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siAuthenticationService;
    connection : DecomposedBy connect parent ::> gpcaSoftware to child ::> siSafetyCoprocessorFirmware;

    // ═══════════════════════════════════════════════════════════════════════
    // SOFTWARE UNITS (≥15)
    // ═══════════════════════════════════════════════════════════════════════

    // Infusion Manager units
    part suFlowRateController : SoftwareUnit {
        attribute redefines name = "Flow Rate PID Controller";
        doc /* PID control loop for motor speed regulation. 10 Hz update. */
    }

    part suModeStateMachine : SoftwareUnit {
        attribute redefines name = "Mode State Machine";
        doc /* GPCA hierarchical state machine: OFF→ON→IDLE→THERAPY→
             * ACTIVE→BASAL/BOLUS/PAUSED. 16 transitions. */
    }

    part suBolusScheduler : SoftwareUnit {
        attribute redefines name = "Bolus Scheduler";
        doc /* Manages bolus request queue, lockout timer, dose calculation,
             * and max bolus count enforcement. */
    }

    part suTimerService : SoftwareUnit {
        attribute redefines name = "Timer Service";
        doc /* Centralized timer management: lockout, bolus duration,
             * alarm silence, config timeout, session timeout. */
    }

    part suKVOController : SoftwareUnit {
        attribute redefines name = "KVO Controller";
        doc /* Maintains KVO delivery rate when infusion inhibited/paused. */
    }

    part suVolumeTracker : SoftwareUnit {
        attribute redefines name = "Volume Delivery Tracker";
        doc /* Running total of delivered volume with ±2% accuracy. */
    }

    // Alarm Manager units
    part suAirBubbleDetector : SoftwareUnit {
        attribute redefines name = "Air Bubble Detector";
        doc /* Dual ultrasonic sensor processing for air detection.
             * Cumulative volume tracking. 50 µL threshold. */
    }

    part suOcclusionDetector : SoftwareUnit {
        attribute redefines name = "Occlusion Detector";
        doc /* Adaptive pressure-based occlusion detection. <30s latency. */
    }

    part suOverInfusionMonitor : SoftwareUnit {
        attribute redefines name = "Over-Infusion Monitor";
        doc /* Real-time delivered vs prescribed comparison. 10% threshold. */
    }

    part suUnderInfusionMonitor : SoftwareUnit {
        attribute redefines name = "Under-Infusion Monitor";
        doc /* Tracks under-delivery. 80% threshold warning. */
    }

    part suReverseFlowDetector : SoftwareUnit {
        attribute redefines name = "Reverse Flow Detector";
        doc /* Detects negative flow rate. Immediate valve close. */
    }

    // System Monitor units
    part suSensorFusion : SoftwareUnit {
        attribute redefines name = "Sensor Data Fusion";
        doc /* Cross-validates dual flow and pressure sensors. */
    }

    part suSelfTestRoutine : SoftwareUnit {
        attribute redefines name = "Power-On Self Test";
        doc /* POST: RAM, ROM CRC, motor, sensor, display, comm tests. */
    }

    part suWatchdogService : SoftwareUnit {
        attribute redefines name = "Watchdog Service";
        doc /* Resets hardware watchdog every 50ms from main loop. */
    }

    // Configuration Manager units
    part suPrescriptionValidator : SoftwareUnit {
        attribute redefines name = "Prescription Validator";
        doc /* Validates parameters against hard/soft drug library limits. */
    }

    part suBarcodeProcessor : SoftwareUnit {
        attribute redefines name = "Barcode/RFID Processor";
        doc /* Decodes drug identifier from barcode/RFID scan. */
    }

    // Logging Service units
    part suEventLogger : SoftwareUnit {
        attribute redefines name = "Event Logger";
        doc /* Circular buffer event log with timestamps and CRC. */
    }

    part suNVStorageManager : SoftwareUnit {
        attribute redefines name = "NV Storage Manager";
        doc /* Wear-leveled flash storage with integrity verification. */
    }

    // UI Controller units
    part suDisplayRenderer : SoftwareUnit {
        attribute redefines name = "Display Renderer";
        doc /* 2 Hz display update: mode, rate, volume, alarms, battery. */
    }

    part suMotorDriver : SoftwareUnit {
        attribute redefines name = "Motor Driver Interface";
        doc /* PWM motor control with position feedback and stall detection. */
    }

    // Software Item → Unit decomposition
    connection : DecomposedBy connect parent ::> siInfusionManager to child ::> suFlowRateController;
    connection : DecomposedBy connect parent ::> siInfusionManager to child ::> suModeStateMachine;
    connection : DecomposedBy connect parent ::> siInfusionManager to child ::> suBolusScheduler;
    connection : DecomposedBy connect parent ::> siInfusionManager to child ::> suTimerService;
    connection : DecomposedBy connect parent ::> siInfusionManager to child ::> suKVOController;
    connection : DecomposedBy connect parent ::> siInfusionManager to child ::> suVolumeTracker;
    connection : DecomposedBy connect parent ::> siInfusionManager to child ::> suMotorDriver;
    connection : DecomposedBy connect parent ::> siAlarmManager to child ::> suAirBubbleDetector;
    connection : DecomposedBy connect parent ::> siAlarmManager to child ::> suOcclusionDetector;
    connection : DecomposedBy connect parent ::> siAlarmManager to child ::> suOverInfusionMonitor;
    connection : DecomposedBy connect parent ::> siAlarmManager to child ::> suUnderInfusionMonitor;
    connection : DecomposedBy connect parent ::> siAlarmManager to child ::> suReverseFlowDetector;
    connection : DecomposedBy connect parent ::> siSystemMonitor to child ::> suSensorFusion;
    connection : DecomposedBy connect parent ::> siSystemMonitor to child ::> suSelfTestRoutine;
    connection : DecomposedBy connect parent ::> siSystemMonitor to child ::> suWatchdogService;
    connection : DecomposedBy connect parent ::> siConfigurationManager to child ::> suPrescriptionValidator;
    connection : DecomposedBy connect parent ::> siConfigurationManager to child ::> suBarcodeProcessor;
    connection : DecomposedBy connect parent ::> siLoggingService to child ::> suEventLogger;
    connection : DecomposedBy connect parent ::> siLoggingService to child ::> suNVStorageManager;
    connection : DecomposedBy connect parent ::> siUIController to child ::> suDisplayRenderer;

    // ═══════════════════════════════════════════════════════════════════════
    // SOUP ITEMS (≥5)
    // ═══════════════════════════════════════════════════════════════════════

    part soupRTOS : SOUPItem {
        attribute redefines name = "FreeRTOS v10.5.1";
        doc /* Real-time operating system for task scheduling on Cortex-M7.
             * Known anomalies: none in safety-relevant areas.
             * Risk: Task starvation under high interrupt load.
             * Verification: RTOS stress tests, priority inversion tests. */
    }

    part soupCommStack : SOUPItem {
        attribute redefines name = "lwIP v2.2.0 TCP/IP Stack";
        doc /* Lightweight IP stack for Ethernet communication.
             * Known anomalies: CVE-2020-22284 (patched in v2.1.3).
             * Risk: Network buffer overflow under flood attack.
             * Verification: Fuzz testing, penetration testing. */
    }

    part soupDisplayDriver : SOUPItem {
        attribute redefines name = "LVGL v8.3 Display Library";
        doc /* Embedded graphics library for TFT display rendering.
             * Known anomalies: none safety-relevant.
             * Risk: Memory leak in animation engine.
             * Verification: Display render tests, memory profiling. */
    }

    part soupCryptoLib : SOUPItem {
        attribute redefines name = "mbedTLS v3.4.0";
        doc /* Cryptographic library for TLS 1.3 and AES-256 encryption.
             * Known anomalies: CVE-2023-43615 (patched in v3.4.1).
             * Risk: Side-channel attack on AES implementation.
             * Verification: Crypto validation tests (CAVP), timing analysis. */
    }

    part soupFHIRClient : SOUPItem {
        attribute redefines name = "FHIR Client Library v1.2.0";
        doc /* HL7 FHIR R4 client for pharmacy database queries.
             * Known anomalies: timeout handling incomplete in v1.1.
             * Risk: Hung connection on network partition.
             * Verification: Timeout tests, connection resilience tests. */
    }

    part soupFlashFS : SOUPItem {
        attribute redefines name = "LittleFS v2.5.1";
        doc /* Wear-leveled flash filesystem for non-volatile storage.
             * Known anomalies: none safety-relevant.
             * Risk: Data loss on power failure during write.
             * Verification: Power-loss simulation tests, CRC verification. */
    }

    // SOUP evaluation
    part soupEvalRTOS : SOUPEvaluation {
        attribute redefines name = "FreeRTOS SOUP Evaluation";
        doc /* Evaluation: FreeRTOS v10.5.1 qualified for IEC 62304 Class C.
             * Pre-certified by Amazon. No known safety anomalies.
             * Mitigation: Watchdog timer detects scheduling failures. */
    }

    part soupEvalCrypto : SOUPEvaluation {
        attribute redefines name = "mbedTLS SOUP Evaluation";
        doc /* Evaluation: mbedTLS v3.4.0 FIPS 140-2 validated module.
             * CVE patched. Side-channel mitigation applied.
             * Verification: CAVP testing and timing analysis completed. */
    }

    // SOUP dependencies
    connection : Dependency connect client ::> siInfusionManager to supplier ::> soupRTOS;
    connection : Dependency connect client ::> siAlarmManager to supplier ::> soupRTOS;
    connection : Dependency connect client ::> siNotificationController to supplier ::> soupRTOS;
    connection : Dependency connect client ::> siDrugDatabaseInterface to supplier ::> soupCommStack;
    connection : Dependency connect client ::> siDrugDatabaseInterface to supplier ::> soupFHIRClient;
    connection : Dependency connect client ::> siDrugDatabaseInterface to supplier ::> soupCryptoLib;
    connection : Dependency connect client ::> siUIController to supplier ::> soupDisplayDriver;
    connection : Dependency connect client ::> siLoggingService to supplier ::> soupFlashFS;
    connection : Dependency connect client ::> siAuthenticationService to supplier ::> soupCryptoLib;

    // ═══════════════════════════════════════════════════════════════════════
    // SOFTWARE REQUIREMENT ALLOCATION
    // ═══════════════════════════════════════════════════════════════════════

    connection : AllocateTo connect function ::> swReqFlowRateControl to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> swReqModeStateMachine to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> swReqKVOController to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> swReqBolusScheduler to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> swReqTimerManagement to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> swReqVolumeTracking to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> swReqMotorDriver to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> swReqAirBubbleAlgorithm to structure ::> siAlarmManager;
    connection : AllocateTo connect function ::> swReqOcclusionAlgorithm to structure ::> siAlarmManager;
    connection : AllocateTo connect function ::> swReqOverInfusionMonitor to structure ::> siAlarmManager;
    connection : AllocateTo connect function ::> swReqReverseFlowDetector to structure ::> siAlarmManager;
    connection : AllocateTo connect function ::> swReqNotificationPriority to structure ::> siNotificationController;
    connection : AllocateTo connect function ::> swReqAlarmManager to structure ::> siNotificationController;
    connection : AllocateTo connect function ::> swReqPrescriptionValidator to structure ::> siConfigurationManager;
    connection : AllocateTo connect function ::> swReqBarcodeProcessor to structure ::> siConfigurationManager;
    connection : AllocateTo connect function ::> swReqSensorFusion to structure ::> siSystemMonitor;
    connection : AllocateTo connect function ::> swReqSelfTestRoutine to structure ::> siSystemMonitor;
    connection : AllocateTo connect function ::> swReqWatchdogService to structure ::> siSystemMonitor;
    connection : AllocateTo connect function ::> swReqPharmacyInterface to structure ::> siDrugDatabaseInterface;
    connection : AllocateTo connect function ::> swReqEventLogger to structure ::> siLoggingService;
    connection : AllocateTo connect function ::> swReqNVStorage to structure ::> siLoggingService;
    connection : AllocateTo connect function ::> swReqDisplayController to structure ::> siUIController;
    connection : AllocateTo connect function ::> swReqAuthenticationModule to structure ::> siAuthenticationService;
    connection : AllocateTo connect function ::> swReqEncryption to structure ::> siAuthenticationService;

    // Risk Control → Software Item allocation
    connection : ImplementsRiskControl connect control ::> rcFlowRateMonitor to subject ::> siInfusionManager;
    connection : ImplementsRiskControl connect control ::> rcKVOFallback to subject ::> siInfusionManager;
    connection : ImplementsRiskControl connect control ::> rcLockoutEnforcement to subject ::> siInfusionManager;
    connection : ImplementsRiskControl connect control ::> rcMaxBolusLimit to subject ::> siInfusionManager;
    connection : ImplementsRiskControl connect control ::> rcOverInfusionInhibit to subject ::> siAlarmManager;
    connection : ImplementsRiskControl connect control ::> rcDualAirSensor to subject ::> siAlarmManager;
    connection : ImplementsRiskControl connect control ::> rcAlarmEscalation to subject ::> siNotificationController;
    connection : ImplementsRiskControl connect control ::> rcAlarmSilenceLimit to subject ::> siNotificationController;
    connection : ImplementsRiskControl connect control ::> rcPrescriptionValidation to subject ::> siConfigurationManager;
    connection : ImplementsRiskControl connect control ::> rcHardLimits to subject ::> siConfigurationManager;
    connection : ImplementsRiskControl connect control ::> rcSoftLimitWarning to subject ::> siConfigurationManager;
    connection : ImplementsRiskControl connect control ::> rcConcentrationScan to subject ::> siConfigurationManager;
    connection : ImplementsRiskControl connect control ::> rcDualFlowSensor to subject ::> siSystemMonitor;
    connection : ImplementsRiskControl connect control ::> rcSelfTest to subject ::> siSystemMonitor;
    connection : ImplementsRiskControl connect control ::> rcHardwareWatchdog to subject ::> siSafetyCoprocessorFirmware;
    connection : ImplementsRiskControl connect control ::> rcPowerFailValveClose to subject ::> siSafetyCoprocessorFirmware;
    connection : ImplementsRiskControl connect control ::> rcSessionAuthentication to subject ::> siAuthenticationService;
    connection : ImplementsRiskControl connect control ::> rcRoleBasedAccess to subject ::> siAuthenticationService;
    connection : ImplementsRiskControl connect control ::> rcTLSEncryption to subject ::> siDrugDatabaseInterface;
    connection : ImplementsRiskControl connect control ::> rcAuditTrail to subject ::> siLoggingService;

    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICATION TEST CASES (≥20)
    // ═══════════════════════════════════════════════════════════════════════

    // Unit Tests
    part testFlowRateAccuracy : Test {
        attribute redefines name = "TC-001: Flow Rate Accuracy ±5%";
        doc /* Verify flow rate within ±5% across 1-999 mL/hr range.
             * Method: Gravimetric measurement at 5 flow rate points. */
    }

    part testModeTransitions : Test {
        attribute redefines name = "TC-002: State Machine Transitions";
        doc /* Verify all 16 GPCA state transitions with correct guard
             * conditions. Method: Automated state machine exerciser. */
    }

    part testBolusLockout : Test {
        attribute redefines name = "TC-003: Bolus Lockout Enforcement";
        doc /* Verify bolus rejected during lockout period.
             * Method: Rapid bolus requests within lockout window. */
    }

    part testMaxBolusCount : Test {
        attribute redefines name = "TC-004: Maximum Bolus Count";
        doc /* Verify bolus inhibited after max count reached.
             * Method: Exhaust bolus count then verify rejection. */
    }

    part testAirDetection : Test {
        attribute redefines name = "TC-005: Air Bubble Detection";
        doc /* Verify air detection at 50 µL threshold.
             * Method: Calibrated air injection test. */
    }

    part testOcclusionDetection : Test {
        attribute redefines name = "TC-006: Occlusion Detection <30s";
        doc /* Verify occlusion alarm within 30 seconds at all flow rates.
             * Method: Controlled occlusion at 5 flow rate points. */
    }

    part testKVODelivery : Test {
        attribute redefines name = "TC-007: KVO Rate Maintenance";
        doc /* Verify KVO rate (1 mL/hr) during inhibit/pause states.
             * Method: Measure delivery during each inhibit condition. */
    }

    part testNotificationTable : Test {
        attribute redefines name = "TC-008: Notification Action Table";
        doc /* Verify all 20 rows of notification action table.
             * Method: Simulate each condition, verify inhibit/stop actions. */
    }

    part testHardLimits : Test {
        attribute redefines name = "TC-009: Hard Limit Rejection";
        doc /* Verify parameters exceeding hard limits are rejected.
             * Method: Boundary value testing at hard limit thresholds. */
    }

    part testSoftLimitWarning : Test {
        attribute redefines name = "TC-010: Soft Limit Warning";
        doc /* Verify warning displayed for soft limit exceedance.
             * Method: Enter parameters between soft and hard limits. */
    }

    // Integration Tests
    part testSensorCrossValidation : Test {
        attribute redefines name = "TC-011: Dual Sensor Cross-Validation";
        doc /* Verify sensor disagreement alarm within 2 seconds.
             * Method: Inject discrepant readings on one sensor. */
    }

    part testWatchdogTrigger : Test {
        attribute redefines name = "TC-012: Watchdog Safe Shutdown";
        doc /* Verify watchdog triggers shutdown on software hang.
             * Method: Block watchdog reset, verify valve close + alarm. */
    }

    part testPowerFailSafe : Test {
        attribute redefines name = "TC-013: Power Failure Safe State";
        doc /* Verify valve close and data persistence on power loss.
             * Method: Disconnect power during active infusion. */
    }

    part testBatteryBackup : Test {
        attribute redefines name = "TC-014: Battery Backup 4-Hour";
        doc /* Verify 4-hour battery operation at maximum flow rate.
             * Method: Continuous delivery on battery until depletion. */
    }

    part testAuthentication : Test {
        attribute redefines name = "TC-015: Clinician Authentication";
        doc /* Verify authentication required for configuration changes.
             * Method: Attempt configuration without authentication. */
    }

    part testSessionTimeout : Test {
        attribute redefines name = "TC-016: Session Timeout Lock";
        doc /* Verify auto-lock after 5 minutes inactivity.
             * Method: Open configuration, wait 5 minutes, verify lock. */
    }

    part testEventLogging : Test {
        attribute redefines name = "TC-017: Event Log Integrity";
        doc /* Verify all events logged with correct timestamps.
             * Method: Generate known event sequence, verify log content. */
    }

    part testPharmacyDBFallback : Test {
        attribute redefines name = "TC-018: Pharmacy DB Timeout Fallback";
        doc /* Verify fallback to local cache on DB timeout.
             * Method: Simulate network failure during query. */
    }

    // System Tests
    part testOverInfusionInhibit : Test {
        attribute redefines name = "TC-019: Over-Infusion Auto-Inhibit";
        doc /* Verify infusion inhibited at >10% over-delivery.
             * Method: Simulate flow rate increase beyond tolerance. */
    }

    part testAlarmEscalation : Test {
        attribute redefines name = "TC-020: Alarm Priority Escalation";
        doc /* Verify medium alarm escalates to high after timeout.
             * Method: Trigger medium alarm, wait for escalation. */
    }

    part testSelfTest : Test {
        attribute redefines name = "TC-021: Power-On Self Test";
        doc /* Verify POST blocks operation on any test failure.
             * Method: Inject fault in each POST step, verify block. */
    }

    part testReverseFlowProtection : Test {
        attribute redefines name = "TC-022: Reverse Flow Valve Close";
        doc /* Verify immediate valve close on reverse flow.
             * Method: Simulate negative flow, measure response time. */
    }

    part testAntiFreeFLow : Test {
        attribute redefines name = "TC-023: Anti-Free-Flow Mechanism";
        doc /* Verify free flow prevention when tubing removed.
             * Method: Remove tubing during delivery, verify no flow. */
    }

    part testDoorInterlock : Test {
        attribute redefines name = "TC-024: Door Interlock Inhibit";
        doc /* Verify infusion inhibited when door opened.
             * Method: Open door during delivery, verify inhibit. */
    }

    part testTLSEncryption : Test {
        attribute redefines name = "TC-025: TLS 1.3 Communication";
        doc /* Verify all network traffic encrypted with TLS 1.3.
             * Method: Network capture analysis for unencrypted traffic. */
    }

    // Verification connections (Test → Requirement)
    connection : Verify connect verifiedBy ::> testFlowRateAccuracy to verifies ::> sysReqBasalDelivery;
    connection : Verify connect verifiedBy ::> testFlowRateAccuracy to verifies ::> sysReqMotorControl;
    connection : Verify connect verifiedBy ::> testModeTransitions to verifies ::> sysReqStartInfusion;
    connection : Verify connect verifiedBy ::> testModeTransitions to verifies ::> sysReqPauseInfusion;
    connection : Verify connect verifiedBy ::> testModeTransitions to verifies ::> sysReqResumeInfusion;
    connection : Verify connect verifiedBy ::> testModeTransitions to verifies ::> sysReqStopInfusion;
    connection : Verify connect verifiedBy ::> testBolusLockout to verifies ::> sysReqLockoutPeriod;
    connection : Verify connect verifiedBy ::> testMaxBolusCount to verifies ::> sysReqMaxBolusCount;
    connection : Verify connect verifiedBy ::> testAirDetection to verifies ::> sysReqAirDetection;
    connection : Verify connect verifiedBy ::> testOcclusionDetection to verifies ::> sysReqOcclusionDetection;
    connection : Verify connect verifiedBy ::> testKVODelivery to verifies ::> sysReqKVODelivery;
    connection : Verify connect verifiedBy ::> testNotificationTable to verifies ::> sysReqInhibitInfusion;
    connection : Verify connect verifiedBy ::> testNotificationTable to verifies ::> sysReqInhibitSquareBolus;
    connection : Verify connect verifiedBy ::> testNotificationTable to verifies ::> sysReqInhibitPatientBolus;
    connection : Verify connect verifiedBy ::> testNotificationTable to verifies ::> sysReqStopBolus;
    connection : Verify connect verifiedBy ::> testHardLimits to verifies ::> sysReqHardLimitCheck;
    connection : Verify connect verifiedBy ::> testSoftLimitWarning to verifies ::> sysReqSoftLimitCheck;
    connection : Verify connect verifiedBy ::> testSensorCrossValidation to verifies ::> sysReqFlowSensorRedundancy;
    connection : Verify connect verifiedBy ::> testWatchdogTrigger to verifies ::> sysReqWatchdog;
    connection : Verify connect verifiedBy ::> testPowerFailSafe to verifies ::> sysReqPowerFailSafe;
    connection : Verify connect verifiedBy ::> testBatteryBackup to verifies ::> sysReqBatteryBackup;
    connection : Verify connect verifiedBy ::> testAuthentication to verifies ::> sysReqAuthentication;
    connection : Verify connect verifiedBy ::> testSessionTimeout to verifies ::> sysReqSessionTimeout;
    connection : Verify connect verifiedBy ::> testEventLogging to verifies ::> sysReqEventLog;
    connection : Verify connect verifiedBy ::> testPharmacyDBFallback to verifies ::> sysReqDrugLibrary;
    connection : Verify connect verifiedBy ::> testOverInfusionInhibit to verifies ::> sysReqOverInfusionDetection;
    connection : Verify connect verifiedBy ::> testAlarmEscalation to verifies ::> sysReqAlarmEscalation;
    connection : Verify connect verifiedBy ::> testSelfTest to verifies ::> sysReqSelfTest;
    connection : Verify connect verifiedBy ::> testReverseFlowProtection to verifies ::> sysReqReverseFlow;
    connection : Verify connect verifiedBy ::> testAntiFreeFLow to verifies ::> sysReqAntiFreeFLow;
    connection : Verify connect verifiedBy ::> testDoorInterlock to verifies ::> sysReqDoorInterlock;
    connection : Verify connect verifiedBy ::> testTLSEncryption to verifies ::> sysReqAuthentication;

    // Software verification connections
    connection : Verify connect verifiedBy ::> testFlowRateAccuracy to verifies ::> swReqFlowRateControl;
    connection : Verify connect verifiedBy ::> testModeTransitions to verifies ::> swReqModeStateMachine;
    connection : Verify connect verifiedBy ::> testBolusLockout to verifies ::> swReqBolusScheduler;
    connection : Verify connect verifiedBy ::> testAirDetection to verifies ::> swReqAirBubbleAlgorithm;
    connection : Verify connect verifiedBy ::> testOcclusionDetection to verifies ::> swReqOcclusionAlgorithm;
    connection : Verify connect verifiedBy ::> testKVODelivery to verifies ::> swReqKVOController;
    connection : Verify connect verifiedBy ::> testNotificationTable to verifies ::> swReqNotificationPriority;
    connection : Verify connect verifiedBy ::> testWatchdogTrigger to verifies ::> swReqWatchdogService;
    connection : Verify connect verifiedBy ::> testOverInfusionInhibit to verifies ::> swReqOverInfusionMonitor;
    connection : Verify connect verifiedBy ::> testReverseFlowProtection to verifies ::> swReqReverseFlowDetector;
    connection : Verify connect verifiedBy ::> testSensorCrossValidation to verifies ::> swReqSensorFusion;
    connection : Verify connect verifiedBy ::> testSelfTest to verifies ::> swReqSelfTestRoutine;
    connection : Verify connect verifiedBy ::> testEventLogging to verifies ::> swReqEventLogger;
    connection : Verify connect verifiedBy ::> testAuthentication to verifies ::> swReqAuthenticationModule;
    connection : Verify connect verifiedBy ::> testTLSEncryption to verifies ::> swReqEncryption;

    // ═══════════════════════════════════════════════════════════════════════
    // IEC 62304 LIFECYCLE ARTIFACTS
    // ═══════════════════════════════════════════════════════════════════════

    part swDevPlan : SoftwareDevelopmentPlan {
        attribute redefines name = "GPCA Software Development Plan";
        doc /* IEC 62304 compliant SDP for Class C software.
             * Defines processes, tools, coding standards, review procedures. */
    }

    part swReqSpec : SoftwareRequirementsArtifact {
        attribute redefines name = "GPCA Software Requirements Specification";
    }

    part swArchDoc : SoftwareArchitectureArtifact {
        attribute redefines name = "GPCA Software Architecture Document";
    }

    part swDetailedDesign : SoftwareDetailedDesign {
        attribute redefines name = "GPCA Software Detailed Design";
    }

    // Lifecycle processes
    action swDevProcess : SoftwareDevelopmentProcess {
        attribute redefines name = "GPCA Software Development Process";
    }

    action swReqAnalysis : SoftwareRequirementsAnalysisActivity {
        attribute redefines name = "GPCA SW Requirements Analysis";
    }

    action swArchDesign : SoftwareArchitecturalDesignActivity {
        attribute redefines name = "GPCA SW Architectural Design";
    }

    action swDetailDesign : SoftwareDetailedDesignActivity {
        attribute redefines name = "GPCA SW Detailed Design";
    }

    action swVerification : SoftwareVerificationActivity {
        attribute redefines name = "GPCA SW Verification";
    }

    // Process governance
    connection : GovernsActivity connect process ::> swDevProcess to activity ::> swReqAnalysis;
    connection : GovernsActivity connect process ::> swDevProcess to activity ::> swArchDesign;
    connection : GovernsActivity connect process ::> swDevProcess to activity ::> swDetailDesign;
    connection : GovernsActivity connect process ::> swDevProcess to activity ::> swVerification;

    // Activity → Work Product
    connection : ProducesWorkProduct connect activity ::> swReqAnalysis to workProduct ::> swReqSpec;
    connection : ProducesWorkProduct connect activity ::> swArchDesign to workProduct ::> swArchDoc;
    connection : ProducesWorkProduct connect activity ::> swDetailDesign to workProduct ::> swDetailedDesign;
}
