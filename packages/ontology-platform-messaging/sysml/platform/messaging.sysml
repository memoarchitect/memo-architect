package MEMO_Ontology_Platform_Messaging {

    part def RabbitMqBroker :> MessageBroker { }

    interface def RabbitMqExchange :> BrokerExchange { }

    interface def RabbitMqQueue :> BrokerQueue { }

    interface def RabbitMqPublisher :> MessageProducer { }

    interface def RabbitMqConsumer :> MessageConsumer { }
}
