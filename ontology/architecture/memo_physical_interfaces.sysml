package memo {
    package architecture {
        package physical_interfaces {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;
            part def PhysicalInterface specializes InterfaceElement { attribute domainKind : InterfaceDomainKind; attribute interfaceKind : InterfaceKind; attribute protocol : String; attribute directionality : DirectionKind; attribute bandwidth : String; attribute timingConstraint : String; }
            part def HardwareInterface specializes PhysicalInterface { attribute electricalStandard : String; attribute nominalVoltageV : Real; attribute nominalCurrentA : Real; }
        }
    }
}
