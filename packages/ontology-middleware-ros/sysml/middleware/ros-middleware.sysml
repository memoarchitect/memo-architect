package MEMO_Ontology_Middleware_ROS {

    part def RosNode :> EventDrivenService { }

    interface def RosTopic :> TopicChannel { }

    interface def RosService :> RequestResponseInterface { }

    interface def RosAction :> RequestResponseInterface { }

    interface def RosPublication :> MessageProducer { }

    interface def RosSubscription :> MessageConsumer { }

    interface def RosServiceCall :> ServiceConsumerInterface { }

    interface def RosServiceServer :> ServiceProviderInterface { }

    interface def RosActionClient :> ServiceConsumerInterface { }

    interface def RosActionServer :> ServiceProviderInterface { }

    item def RosMessage :> Message { }

    item def RosEventMessage :> EventMessage { }

    item def RosStateMessage :> StateMessage { }

    item def RosCommandMessage :> CommandMessage { }

    item def RosRequest :> RequestMessage { }

    item def RosResponse :> ResponseMessage { }

    item def RosActionGoal :> RequestMessage { }

    item def RosActionResult :> ResponseMessage { }

    item def RosActionFeedback :> Message { }

    part def RosMessageSchema :> MessageSchema { }

    part def RosMessageField :> MessageField { }
}
