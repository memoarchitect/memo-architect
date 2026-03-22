package MEMO_Ontology_Medical_Platform {

    // Temporary implementation/platform concepts kept in the ontology layer
    // until multi-ontology composition is available in the config chain.
    part def Docker :> Software { }

    part def RosNode :> SoftwareComponent { }

    interface def RosTopic :> PublishSubscribeChannel { }

    interface def RosService :> RequestResponseInterface { }

    interface def RosPublication :> PublisherInterface { }

    interface def RosSubscription :> SubscriberInterface { }

    interface def RosServiceCall :> ServiceConsumerInterface { }

    interface def RosServiceServer :> ServiceProviderInterface { }

    item def RosMessage :> Message { }

    item def RosEventMessage :> EventMessage { }

    item def RosStateMessage :> StateMessage { }

    item def RosCommandMessage :> CommandMessage { }

    item def RosRequest :> RequestMessage { }

    item def RosResponse :> ResponseMessage { }

    part def RosMessageSchema :> MessageSchema { }

    part def RosMessageField :> MessageField { }
}
