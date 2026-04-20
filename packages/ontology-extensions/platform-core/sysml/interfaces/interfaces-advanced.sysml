package MEMO_Extension_Interfaces_Advanced {

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
}
