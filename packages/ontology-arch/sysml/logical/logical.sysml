package MEMO_Ontology_Arch_Logical {

    part def LogicalComponent {
        attribute name : String;
        attribute componentId : String;
        attribute responsibility : String;
    }

    part def Interface {
        attribute name : String;
        attribute protocol : String;
        attribute direction : String;
    }

    part def Port {
        attribute name : String;
        attribute portType : String;
        attribute direction : String;
        attribute dataType : String;
    }
}
