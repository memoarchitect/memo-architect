package MEMO_Ontology_Platform_Robotics {

    part def RosNode :> EventDrivenService { }

    interface def RosTopic :> TopicChannel { }

    interface def RosService :> RequestResponseInterface { }

    interface def RosPublication :> MessageProducer { }

    interface def RosSubscription :> MessageConsumer { }

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
