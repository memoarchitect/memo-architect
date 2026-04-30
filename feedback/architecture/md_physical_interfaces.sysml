package md::architecture::physical_interfaces {
    private import md::core::common::*;
    private import md::core::enumerations::*;
    part def PhysicalInterface :> InterfaceElement { attribute domainKind : InterfaceDomainKind; attribute interfaceKind : InterfaceKind; attribute protocol : String; attribute directionality : DirectionKind; attribute bandwidth : String; attribute timingConstraint : String; }
    part def HardwareInterface :> PhysicalInterface { attribute electricalStandard : String; attribute nominalVoltageV : Real; attribute nominalCurrentA : Real; }
}
