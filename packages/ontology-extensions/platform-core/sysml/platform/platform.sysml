package MEMO_Extension_Platform {

    // §4.5.13 — Docker is kept as a distinct container-runtime with its own
    // image/tag metadata (P1 rule 1 — distinct structural attributes).
    part def Docker :> Software {
        attribute image : String;
        attribute tag : String;
        attribute runtimeSocket : String;
    }

    // §4.5.13 — event-driven service carries the event contract it subscribes to.
    part def EventDrivenService :> SoftwareComponent {
        attribute consumedEvent : String;
        attribute deliverySemantic : String; // "at-least-once" | "exactly-once"
    }

    // §4.5.13 — message broker carries its transport + clustering metadata.
    part def MessageBroker :> SoftwareComponent {
        attribute brokerProtocol : String;  // "AMQP" | "MQTT" | "Kafka"
        attribute clusterSize : Integer;
    }

    interface def EventBus :> PublishSubscribeChannel { }

    interface def TopicChannel :> PublishSubscribeChannel { }

    interface def QueueChannel :> PublishSubscribeChannel { }

    interface def MessageProducer :> PublisherInterface { }

    interface def MessageConsumer :> SubscriberInterface { }

    interface def BrokerExchange :> TopicChannel { }

    interface def BrokerQueue :> QueueChannel { }
}
