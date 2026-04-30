package memo::architecture::logical_interfaces {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def LogicalInterface :> InterfaceElement { attribute domainKind : InterfaceDomainKind; attribute interfaceKind : InterfaceKind; attribute interactionPattern : String; attribute protocolSemantics : String; }
}
