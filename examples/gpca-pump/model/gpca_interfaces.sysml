package memo {
    package examples {
        package gpca {
            package interfaces {
                private import memo::architecture::logical_interfaces::*;
                private import memo::architecture::physical_interfaces::*;
                private import memo::core::enumerations::*;
                interface def SensorDataInterface :> DataInterface { attribute interfaceKind = InterfaceKind::data; attribute protocolSemantics = "flow, air, occlusion, door, battery, cpu, memory, pump state"; }
                port def SensorInputPort :> SensorPort { attribute direction = DirectionKind::input; attribute interfaceType = "SensorDataInterface"; attribute sensorDomain = "physiological and device state"; }
                part sensorInputInterface : LogicalInterface { attribute id = "LI-005"; attribute name = "SensorInputInterface"; attribute domainKind = InterfaceDomainKind::logical; attribute interfaceKind = InterfaceKind::data; attribute direction = DirectionKind::input; attribute interactionPattern = "sensor feed"; attribute protocolSemantics = "flow, air, occlusion, door, battery, cpu, memory, pump state"; }
                part hwSoftwareBus : HardwareInterface { attribute id = "PI-001"; attribute name = "HW_SW_DataBus"; attribute domainKind = InterfaceDomainKind::hardware; attribute interfaceKind = InterfaceKind::digitalSignal; attribute protocol = "immediate data port mapping"; attribute directionality = DirectionKind::bidirectional; attribute bandwidth = "implementation-defined"; attribute timingConstraint = "same execution step where required"; attribute electricalStandard = "logical/AADL"; attribute nominalVoltageV = 3.3; attribute nominalCurrentA = 0.02; }
            }
        }
    }
}
