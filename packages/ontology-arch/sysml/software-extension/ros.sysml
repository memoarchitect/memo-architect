package MEMO_Ontology_Arch_SoftwareExtension_ROS {

    part def ROSNode :> MEMO_Ontology_Arch_Software::SoftwareComponent {
        attribute nodeName : String;
        attribute namespace : String;
        attribute rate : String;
    }

    part def ROSTopic {
        attribute topicName : String;
        attribute messageType : String;
        attribute qosProfile : String;
    }

    part def ROSMessageType {
        attribute messageTypeName : String;
        attribute rosPackage : String;
        attribute fields : String;
    }

    part def ROSService {
        attribute serviceName : String;
        attribute requestType : String;
        attribute responseType : String;
    }

    part def ROSAction {
        attribute actionName : String;
        attribute goalType : String;
        attribute resultType : String;
        attribute feedbackType : String;
    }
}
