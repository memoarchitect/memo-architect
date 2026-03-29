package MEMO_Ontology_Medical_ProductLine {

    part def ProductFamily {
        attribute familyId : String;
        attribute name : String;
    }

    part def ProductVariant {
        attribute variantId : String;
        attribute name : String;
    }

    part def FeatureOption {
        attribute name : String;
        attribute category : String;
    }

    part def Accessory {
        attribute accessoryId : String;
        attribute name : String;
    }

    part def ConfigurationBaseline :> ReleaseBaseline { }

    requirement def VariantConstraint :> Requirement {
        attribute title : String;
    }
}
