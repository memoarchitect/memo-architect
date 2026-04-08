package MEMO_Ontology_Core_Relationships {

    connection def Aggregation {
        end whole[1];
        end part[0..*];
    }

    connection def Association {
        end source[1];
        end target[1];
    }

    connection def TraceTo {
        end source[1];
        end target[1];
    }

    connection def Refines {
        end refined[1];
        end refiner[1];
    }

    connection def Derives {
        end source[1];
        end derived[1];
    }

    connection def Constrains {
        end constraint[1];
        end constrained[1];
    }

    connection def AllocateTo {
        end function[1];
        end structure[1];
    }

    connection def ComposedOf {
        end whole[1];
        end part[0..*];
    }

    connection def DecomposedBy {
        end parent[1];
        end child[0..*];
    }

    connection def Dependency {
        end client[1];
        end supplier[1];
    }

    connection def ExposesInterface {
        end provider[1];
        end dataInterface : DataInterface [1];
    }

    connection def Realization {
        end realizing[1];
        end realized[1];
    }

    connection def Satisfy {
        end satisfiedBy[1];
        end satisfies : Requirement [1];
    }

    connection def Verify {
        end verifiedBy[1];
        end verifies[1];
    }

    connection def Flow {
        end source[1];
        end target[1];
    }

    connection def Succession {
        end predecessor[1];
        end successor[1];
    }
}
