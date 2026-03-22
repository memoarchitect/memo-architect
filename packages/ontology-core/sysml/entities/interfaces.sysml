package MEMO_Ontology_Core_Interfaces {

    port def Port { }

    port def PortEthernet :> Port { }

    port def PortUSB :> Port { }

    port def PortSerial :> Port { }

    port def PortPower :> Port { }

    port def DataEndpoint :> Port { }

    interface def Interface { }

    interface def DataInterface :> Interface { }

    interface def SoftwareInterface :> Interface { }

    interface def SoftwareProvidedInterface :> SoftwareInterface { }

    interface def SoftwareRequiredInterface :> SoftwareInterface { }

    interface def InterfaceContract :> Interface { }

    interface def CommunicationProtocol :> InterfaceContract { }

    interface def InteroperabilityProfile :> InterfaceContract { }

    item def ExchangeItem {
        attribute name : String;
    }

    attribute def DataType { }
}
