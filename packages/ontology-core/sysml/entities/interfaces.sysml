package MEMO_Ontology_Core_Interfaces {

    port def Port { }

    interface def Interface { }

    interface def InterfaceContract :> Interface { }

    item def ExchangeItem {
        attribute name : String;
    }

    attribute def DataType { }
}
