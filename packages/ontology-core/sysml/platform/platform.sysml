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

}
