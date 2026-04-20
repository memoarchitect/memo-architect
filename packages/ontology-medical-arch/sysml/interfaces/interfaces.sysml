package MEMO_Ontology_MedicalArch_Interfaces {

    enum def PortDirection {
        enum Inbound;
        enum Outbound;
        enum Bidirectional;
    }

    port def Port {
        attribute protocol : String;
        attribute direction : PortDirection;
    }

    interface def Interface { }

    interface def DataInterface :> Interface { }

    interface def InterfaceContract :> Interface { }

    item def ExchangeItem {
        attribute name : String;
    }

    item def Message :> ExchangeItem {
        attribute semanticRole : String;
    }

    attribute def DataType { }

    // ─── Software interfaces (folded from ontology-extensions/platform-core) ──
    interface def PublishSubscribeChannel :> DataInterface { }

    interface def RequestResponseInterface :> DataInterface { }

    interface def SoftwareInterface :> Interface { }

    interface def SoftwareProvidedInterface :> SoftwareInterface { }

    interface def SoftwareRequiredInterface :> SoftwareInterface { }

    interface def PublisherInterface :> SoftwareProvidedInterface { }

    interface def SubscriberInterface :> SoftwareRequiredInterface { }

    interface def ServiceProviderInterface :> SoftwareProvidedInterface { }

    interface def ServiceConsumerInterface :> SoftwareRequiredInterface { }

    interface def CommunicationProtocol :> InterfaceContract { }

    interface def InteroperabilityProfile :> InterfaceContract { }

    // Messaging primitives + payload subtypes
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

    // Platform / broker nodes
    interface def EventBus :> PublishSubscribeChannel { }

    interface def TopicChannel :> PublishSubscribeChannel { }

    interface def QueueChannel :> PublishSubscribeChannel { }

    interface def MessageProducer :> PublisherInterface { }

    interface def MessageConsumer :> SubscriberInterface { }

    interface def BrokerExchange :> TopicChannel { }

    interface def BrokerQueue :> QueueChannel { }
}
