package memo {
    package architecture {
        package logical_interfaces {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;
            part def LogicalInterface specializes InterfaceElement { attribute domainKind : InterfaceDomainKind; attribute interfaceKind : InterfaceKind; attribute interactionPattern : String; attribute protocolSemantics : String; }
            interface def DataInterface specializes InterfaceElement { attribute interfaceKind : InterfaceKind; attribute protocolSemantics : String; }
            port def DataPort { attribute direction : DirectionKind; attribute interfaceType : String; }
            port def SensorPort specializes DataPort { attribute sensorDomain : String; }
            port def CommandPort specializes DataPort { attribute commandDomain : String; }
        }
    }
}
