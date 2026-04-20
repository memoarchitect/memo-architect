package MEMO_Ontology_Middleware_ROS {

    // ─────────────────────────────────────────────────────────────────────────
    // ROS 2 Middleware Ontology
    //
    // Derives from @memo/ontology-core Software layer per SEI principles:
    //   SoftwareComponent → RosNode       (a deployable runtime process)
    //   SoftwareModule    → RosPackage    (a cohesive development/release unit)
    //
    // Specialisation rationale (SEI CBAM / Arcadia):
    //   - A RosNode IS-A SoftwareComponent: it executes independently, has a
    //     lifecycle (init/spin/shutdown), owns ports, and is the unit of safety
    //     class assignment when combined with IEC 62304.
    //   - A RosPackage IS-A SoftwareModule: it is the ROS unit of packaging,
    //     versioning, and dependency management — exactly the SEI module concept.
    // ─────────────────────────────────────────────────────────────────────────

    // ─── Structural kinds ────────────────────────────────────────────────────

    // A ROS 2 process that owns a node graph lifecycle.
    // Extends SoftwareComponent from ontology-core/software.
    part def RosNode :> SoftwareComponent {
        attribute nodeNamespace : String;
        attribute executorType : String;    // SingleThreaded | MultiThreaded | StaticSingleThreaded
    }

    // A lightweight intra-process component sharing a thread with its container node.
    part def RosNodelet :> SoftwareComponent {
        attribute containerNode : String;
    }

    // A ROS 2 package: the unit of build, test, release, and dependency.
    // Extends SoftwareModule from ontology-core/software.
    part def RosPackage :> SoftwareModule {
        attribute buildSystem : String;     // ament_cmake | ament_python | colcon
        attribute rosDistro : String;       // humble | iron | jazzy
    }

    // A ROS message schema definition (.msg file).
    part def RosMessageSchema :> SoftwareModule {
        attribute messageFile : String;
    }

    // A field within a message schema.
    part def RosMessageField {
        attribute fieldName : String;
        attribute fieldType : String;
    }

    // ─── Communication interfaces (derive from core Interfaces layer) ─────────

    // An asynchronous pub/sub channel (derives from core TopicChannel concept).
    interface def RosTopic :> TopicChannel { }

    // A synchronous request-reply channel.
    interface def RosService :> RequestResponseInterface { }

    // An asynchronous goal-feedback-result channel (long-running action).
    interface def RosAction :> RequestResponseInterface { }

    // Producer side of a topic channel.
    interface def RosPublication :> MessageProducer { }

    // Consumer side of a topic channel.
    interface def RosSubscription :> MessageConsumer { }

    // Client side of a service call.
    interface def RosServiceCall :> ServiceConsumerInterface { }

    // Server side of a service.
    interface def RosServiceServer :> ServiceProviderInterface { }

    // Client side of an action call.
    interface def RosActionClient :> ServiceConsumerInterface { }

    // Server side of an action.
    interface def RosActionServer :> ServiceProviderInterface { }

    // ─── Message item types (derive from core Interfaces/ExchangeItem) ────────
    item def RosMessage :> Message { }
    item def RosEventMessage :> EventMessage { }
    item def RosStateMessage :> StateMessage { }
    item def RosCommandMessage :> CommandMessage { }
    item def RosRequest :> RequestMessage { }
    item def RosResponse :> ResponseMessage { }
    item def RosActionGoal :> RequestMessage { }
    item def RosActionResult :> ResponseMessage { }
    item def RosActionFeedback :> Message { }
}
