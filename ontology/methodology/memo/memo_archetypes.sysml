package memo {
    package methodology {
        package archetypes {
            private import memo::methodology::core::*;

            part minimal : Archetype {
                attribute id = "ARCH-MINIMAL";
                attribute name = "Minimal";
                attribute label = "Minimal";
                attribute description = "Core ontology only — requirements, hazards, basic architecture (~53 kinds)";
                attribute category = "profile";
                attribute includedLayer = "context";
                attribute includedLayer = "requirements";
                attribute includedLayer = "risk";
                attribute includedStandard = "ISO 14971";
                attribute templateDir = "";
            }

            part standard : Archetype {
                attribute id = "ARCH-STANDARD";
                attribute name = "Standard";
                attribute label = "Standard";
                attribute description = "Core + risk + software + DHF — covers most Class II devices (~120 kinds)";
                attribute category = "profile";
                attribute includedLayer = "context";
                attribute includedLayer = "requirements";
                attribute includedLayer = "functions";
                attribute includedLayer = "logical_structure";
                attribute includedLayer = "software_structure";
                attribute includedLayer = "risk";
                attribute includedLayer = "assurance";
                attribute includedStandard = "ISO 14971";
                attribute includedStandard = "IEC 62304";
                attribute includedStandard = "21 CFR 820";
                attribute templateDir = "";
            }

            part full : Archetype {
                attribute id = "ARCH-FULL";
                attribute name = "Full";
                attribute label = "Full";
                attribute description = "All architecture layers, standards, and extensions (~200+ kinds)";
                attribute category = "profile";
                attribute includedLayer = "context";
                attribute includedLayer = "requirements";
                attribute includedLayer = "functions";
                attribute includedLayer = "logical_structure";
                attribute includedLayer = "logical_interfaces";
                attribute includedLayer = "physical_interfaces";
                attribute includedLayer = "software_structure";
                attribute includedLayer = "hardware_structure";
                attribute includedLayer = "behavior";
                attribute includedLayer = "risk";
                attribute includedLayer = "arch_risk";
                attribute includedLayer = "assurance";
                attribute includedLayer = "cybersecurity";
                attribute includedLayer = "constraints";
                attribute includedStandard = "ISO 14971";
                attribute includedStandard = "IEC 62304";
                attribute includedStandard = "21 CFR 820";
                attribute includedStandard = "ISO 13485";
                attribute includedStandard = "IEC 62366";
                attribute includedStandard = "IEC 60601-1";
                attribute includedStandard = "IEC 82304-1";
                attribute includedStandard = "FDA Cybersecurity Guidance";
                attribute templateDir = "";
            }

            part samd : Archetype {
                attribute id = "ARCH-SAMD";
                attribute name = "SaMD";
                attribute label = "Software as Medical Device (SaMD)";
                attribute description = "Clinical decision support, diagnostic algorithm, AI/ML tool, mobile medical app";
                attribute category = "device-class";
                attribute includedLayer = "context";
                attribute includedLayer = "requirements";
                attribute includedLayer = "functions";
                attribute includedLayer = "logical_structure";
                attribute includedLayer = "software_structure";
                attribute includedLayer = "risk";
                attribute includedLayer = "assurance";
                attribute includedLayer = "cybersecurity";
                attribute includedStandard = "ISO 14971";
                attribute includedStandard = "IEC 62304";
                attribute includedStandard = "IEC 82304-1";
                attribute includedStandard = "FDA Cybersecurity Guidance";
                attribute templateDir = "samd";
            }

            part connected : Archetype {
                attribute id = "ARCH-CONNECTED";
                attribute name = "Connected";
                attribute label = "Connected / IoT Device";
                attribute description = "Remote monitoring, wearable, smart device with cloud connectivity and cybersecurity requirements";
                attribute category = "device-class";
                attribute includedLayer = "context";
                attribute includedLayer = "requirements";
                attribute includedLayer = "functions";
                attribute includedLayer = "logical_structure";
                attribute includedLayer = "logical_interfaces";
                attribute includedLayer = "software_structure";
                attribute includedLayer = "hardware_structure";
                attribute includedLayer = "risk";
                attribute includedLayer = "assurance";
                attribute includedLayer = "cybersecurity";
                attribute includedStandard = "ISO 14971";
                attribute includedStandard = "IEC 62304";
                attribute includedStandard = "21 CFR 820";
                attribute includedStandard = "FDA Cybersecurity Guidance";
                attribute templateDir = "connected-device";
            }

            part monitoring : Archetype {
                attribute id = "ARCH-MONITORING";
                attribute name = "Monitoring";
                attribute label = "Monitoring / Diagnostic Device";
                attribute description = "Patient monitor, ECG, SpO2, vital signs, bedside diagnostic equipment";
                attribute category = "device-class";
                attribute includedLayer = "context";
                attribute includedLayer = "requirements";
                attribute includedLayer = "functions";
                attribute includedLayer = "logical_structure";
                attribute includedLayer = "logical_interfaces";
                attribute includedLayer = "physical_interfaces";
                attribute includedLayer = "software_structure";
                attribute includedLayer = "hardware_structure";
                attribute includedLayer = "risk";
                attribute includedLayer = "assurance";
                attribute includedStandard = "ISO 14971";
                attribute includedStandard = "IEC 62304";
                attribute includedStandard = "IEC 60601-1";
                attribute includedStandard = "21 CFR 820";
                attribute templateDir = "monitoring-device";
            }

            part infusion_pump : Archetype {
                attribute id = "ARCH-INFUSION";
                attribute name = "InfusionPump";
                attribute label = "Infusion / Drug Delivery Device";
                attribute description = "Infusion pump, syringe driver, implantable drug delivery, dosing device";
                attribute category = "device-class";
                attribute includedLayer = "context";
                attribute includedLayer = "requirements";
                attribute includedLayer = "functions";
                attribute includedLayer = "logical_structure";
                attribute includedLayer = "logical_interfaces";
                attribute includedLayer = "physical_interfaces";
                attribute includedLayer = "software_structure";
                attribute includedLayer = "hardware_structure";
                attribute includedLayer = "behavior";
                attribute includedLayer = "risk";
                attribute includedLayer = "arch_risk";
                attribute includedLayer = "assurance";
                attribute includedLayer = "cybersecurity";
                attribute includedStandard = "ISO 14971";
                attribute includedStandard = "IEC 62304";
                attribute includedStandard = "IEC 60601-1";
                attribute includedStandard = "21 CFR 820";
                attribute includedStandard = "ISO 13485";
                attribute templateDir = "infusion-pump";
            }

            part blank : Archetype {
                attribute id = "ARCH-BLANK";
                attribute name = "Blank";
                attribute label = "Blank Project";
                attribute description = "Start from scratch with a minimal SysML shell";
                attribute category = "device-class";
                attribute includedLayer = "";
                attribute includedStandard = "";
                attribute templateDir = "";
            }
        }
    }
}
