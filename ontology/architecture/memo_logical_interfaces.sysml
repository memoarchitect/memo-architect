package memo::architecture::logical_interfaces {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def LogicalInterface :> InterfaceElement { attribute domainKind : InterfaceDomainKind; attribute interfaceKind : InterfaceKind; attribute interactionPattern : String; attribute protocolSemantics : String; }
    interface def DataInterface :> InterfaceElement { attribute interfaceKind : InterfaceKind; attribute protocolSemantics : String; }
    port def DataPort { attribute direction : DirectionKind; attribute interfaceType : String; }
    port def SensorPort :> DataPort { attribute sensorDomain : String; }
    port def CommandPort :> DataPort { attribute commandDomain : String; }
}
