package memo::architecture::physical_interfaces {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def PhysicalInterface :> InterfaceElement { attribute domainKind : InterfaceDomainKind; attribute interfaceKind : InterfaceKind; attribute protocol : String; attribute directionality : DirectionKind; attribute bandwidth : String; attribute timingConstraint : String; }
    part def HardwareInterface :> PhysicalInterface { attribute electricalStandard : String; attribute nominalVoltageV : Real; attribute nominalCurrentA : Real; }
}
