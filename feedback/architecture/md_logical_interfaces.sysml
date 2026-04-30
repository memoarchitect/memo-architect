package md::architecture::logical_interfaces {
    private import md::core::common::*;
    private import md::core::enumerations::*;
    part def LogicalInterface :> InterfaceElement { attribute domainKind : InterfaceDomainKind; attribute interfaceKind : InterfaceKind; attribute interactionPattern : String; attribute protocolSemantics : String; }
}
