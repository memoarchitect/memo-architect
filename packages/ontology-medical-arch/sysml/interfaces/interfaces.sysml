package MEMO_Ontology_MedicalArch_Interfaces {

    enum def PortDirection {
        enum Inbound;
        enum Outbound;
        enum Bidirectional;
    }

    port def Port {
        attribute protocol : String;
        attribute direction : PortDirection;
    }

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
