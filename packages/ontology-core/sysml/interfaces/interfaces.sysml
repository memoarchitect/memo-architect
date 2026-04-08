package MEMO_Ontology_Core_Interfaces {

    port def Port { }

    port def DataEndpoint :> Port { }

    interface def Interface { }

    interface def DataInterface :> Interface { }

    interface def InterfaceContract :> Interface { }

    item def ExchangeItem {
        attribute name : String;
    }

    item def Message :> ExchangeItem {
        attribute semanticRole : String;
    }

    attribute def DataType { }
}
