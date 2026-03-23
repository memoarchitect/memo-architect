package MEMO_Ontology_Core_Platform {

    part def Docker :> Software { }

    part def EventDrivenService :> SoftwareComponent { }

    part def MessageBroker :> SoftwareComponent { }

    interface def EventBus :> PublishSubscribeChannel { }

    interface def TopicChannel :> PublishSubscribeChannel { }

    interface def QueueChannel :> PublishSubscribeChannel { }

    interface def MessageProducer :> PublisherInterface { }

    interface def MessageConsumer :> SubscriberInterface { }

    interface def BrokerExchange :> TopicChannel { }

    interface def BrokerQueue :> QueueChannel { }

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

    part def RabbitMqBroker :> MessageBroker { }

    interface def RabbitMqExchange :> BrokerExchange { }

    interface def RabbitMqQueue :> BrokerQueue { }

    interface def RabbitMqPublisher :> MessageProducer { }

    interface def RabbitMqConsumer :> MessageConsumer { }
}
