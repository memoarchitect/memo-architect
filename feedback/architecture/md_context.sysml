package md::architecture::context {
    private import md::core::common::*;
    part def Actor :> TraceableElement { attribute actorKind : String; attribute trainingLevel : String; }
    part def UseContext :> TraceableElement { attribute careSetting : String; attribute environment : String; attribute jurisdiction : String; attribute connectedUse : Boolean; }
}
