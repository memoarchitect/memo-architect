package memo {
    package examples {
        package gpca {
            package interfaces {
                private import memo::architecture::interfaces::*;
                private import memo::core::enumerations::*;
                interface def SensorDataInterface :> DataInterface { attribute interfaceKind = InterfaceKind::data; attribute protocolSemantics = "flow, air, occlusion, door, battery, cpu, memory, pump state"; }
                port def SensorInputPort :> SensorPort { attribute direction = DirectionKind::input; attribute interfaceType = "SensorDataInterface"; attribute sensorDomain = "physiological and device state"; }
                part sensorInputInterface : SoftwareInterface { attribute id = "LI-005"; attribute name = "SensorInputInterface"; attribute arcadiaLayer = ArcadiaLayerKind::logical; attribute interfaceKind = InterfaceKind::data; attribute direction = DirectionKind::input; attribute interactionPattern = "sensor feed"; attribute protocolSemantics = "flow, air, occlusion, door, battery, cpu, memory, pump state"; }
                part hwSoftwareBus : DigitalInterface { attribute id = "PI-001"; attribute name = "HW_SW_DataBus"; attribute arcadiaLayer = ArcadiaLayerKind::physical; attribute interfaceKind = InterfaceKind::digitalSignal; attribute protocol = "immediate data port mapping"; attribute directionality = DirectionKind::bidirectional; attribute bandwidth = "implementation-defined"; attribute timingConstraint = "same execution step where required"; attribute electricalStandard = "logical/AADL"; attribute nominalVoltageV = 3.3; attribute nominalCurrentA = 0.02; }
            }
        }
    }
}
