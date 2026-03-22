package MEMO_Ontology_Core_Interfaces {

    port def Port { }

    port def PortEthernet :> Port { }

    port def PortUSB :> Port { }

    port def PortSerial :> Port { }

    port def PortPower :> Port { }

    port def DataEndpoint :> Port { }

    interface def Interface { }

    interface def DataInterface :> Interface { }

    interface def PublishSubscribeChannel :> DataInterface { }

    interface def RequestResponseInterface :> DataInterface { }

    interface def SoftwareInterface :> Interface { }

    interface def SoftwareProvidedInterface :> SoftwareInterface { }

    interface def SoftwareRequiredInterface :> SoftwareInterface { }

    interface def PublisherInterface :> SoftwareProvidedInterface { }

    interface def SubscriberInterface :> SoftwareRequiredInterface { }

    interface def ServiceProviderInterface :> SoftwareProvidedInterface { }

    interface def ServiceConsumerInterface :> SoftwareRequiredInterface { }

    interface def InterfaceContract :> Interface { }

    interface def CommunicationProtocol :> InterfaceContract { }

    interface def InteroperabilityProfile :> InterfaceContract { }

    item def ExchangeItem {
        attribute name : String;
    }

    item def Message :> ExchangeItem {
        attribute semanticRole : String;
    }

    item def EventMessage :> Message { }

    item def StateMessage :> Message { }

    item def CommandMessage :> Message { }

    item def RequestMessage :> Message { }

    item def ResponseMessage :> Message { }

    part def MessageSchema {
        attribute schemaId : String;
        attribute title : String;
        attribute encoding : String;
    }

    part def MessageField {
        attribute name : String;
        attribute typeName : String;
        attribute cardinality : String;
    }

    attribute def DataType { }
}
