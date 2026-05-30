package memo {
    package architecture {
        package context {
            private import memo::core::common::*;
            part def Actor specializes TraceableElement { attribute actorKind : String; attribute trainingLevel : String; }
            part def UseContext specializes TraceableElement { attribute careSetting : String; attribute environment : String; attribute jurisdiction : String; attribute connectedUse : Boolean; }
        }
    }
}
