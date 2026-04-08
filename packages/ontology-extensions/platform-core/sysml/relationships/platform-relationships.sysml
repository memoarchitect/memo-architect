package MEMO_Extension_Platform_Relationships {

    connection def HasEndpoint {
        end dataInterface : DataInterface [1];
        end endpoint : DataEndpoint [1];
    }

    connection def ImplementsProtocol {
        end subject[1];
        end protocol : CommunicationProtocol [1];
    }

    connection def ConformsToProfile {
        end subject[1];
        end profile : InteroperabilityProfile [1];
    }

    connection def CarriesExchangeItem {
        end dataInterface : DataInterface [1];
        end exchangeItem : ExchangeItem [1];
    }

    connection def PublishesTo {
        end publisher[1];
        end channel : PublishSubscribeChannel [1];
    }

    connection def SubscribesTo {
        end subscriber[1];
        end channel : PublishSubscribeChannel [1];
    }

    connection def PublishesMessage {
        end publisher[1];
        end message : Message [1];
    }

    connection def ConsumesMessage {
        end subscriber[1];
        end message : Message [1];
    }

    connection def ServesInterface {
        end provider[1];
        end service : RequestResponseInterface [1];
    }

    connection def InvokesInterface {
        end consumer[1];
        end service : RequestResponseInterface [1];
    }

    connection def CarriesRequestMessage {
        end service : RequestResponseInterface [1];
        end request : RequestMessage [1];
    }

    connection def CarriesResponseMessage {
        end service : RequestResponseInterface [1];
        end response : ResponseMessage [1];
    }

    connection def BrokersChannel {
        end broker : MessageBroker [1];
        end channel : PublishSubscribeChannel [1];
    }

    connection def RoutesToChannel {
        end sourceChannel : PublishSubscribeChannel [1];
        end targetChannel : PublishSubscribeChannel [1];
    }

    connection def DefinesMessageSchema {
        end schema : MessageSchema [1];
        end message : Message [1];
    }

    connection def HasMessageField {
        end schema : MessageSchema [1];
        end field : MessageField [0..*];
    }

    connection def ParticipatesInSystemOfSystems {
        end system[1];
        end systemOfSystems : SystemOfSystems [1];
    }

    connection def Trace {
        end source[1];
        end target[1];
    }
}
