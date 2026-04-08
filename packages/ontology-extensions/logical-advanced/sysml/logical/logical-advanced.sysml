package MEMO_Extension_Logical_Advanced {

    part def SystemOfSystems :> System { }

    part def SystemExternal :> System { }

    part def ArchitectureRationale {
        attribute name : String;
    }

    part def Question {
        attribute name : String;
    }
}
