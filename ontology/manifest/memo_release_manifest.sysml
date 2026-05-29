package memo::manifest::release {
    private import memo::core::common::*;

    part def PackageRelease specializes DocumentedElement {
        attribute packageName : String;
        attribute packageVersion : String;
        attribute releaseDate : String;
        attribute releaseType : String;
        attribute compatibilityNote : String;
        attribute migrationNote : String;
    }

    part MD_Package_Release_1_0_0 : PackageRelease {
        title = "Final Medical Device SysML v2 Package";
        shortDescription = "Initial integrated release using a single package-wide version.";
        longDescription = "This release establishes the baseline package structure with dedicated viewpoints and views libraries, a first-class cybersecurity layer, and model-driven view selection semantics. The entire release is versioned as 1.0.0 rather than applying separate versions to each layer.";
        packageName = "Final Medical Device SysML v2 Package";
        packageVersion = "1.0.0";
        releaseDate = "2026-04-23";
        releaseType = "initial integrated release";
        compatibilityNote = "Single release-wide version applied to core, ontology, methodology, viewpoints, views, compliance, and examples.";
        migrationNote = "Internal draft labels such as v10, v11, and v12 are development snapshots only and should not be treated as package versions.";
    }
}
