# Features and design options

A product family differs in places, not everywhere. MEMO uses the SysML way to say
where: a **variation point** (`variation`) owns **variants** (`variant`), and a variant is
an ordinary part, action or other element. What SysML has no word for is why a variant
exists. MEMO adds the **feature**: something the family offers, such as a market, an
accessory or a capability.

```sysml
part featEuMarket : ProductFeature;
variation part outputStage : LogicalComponent {
    variant part euOutput : LogicalComponent;
    variant part usOutput : LogicalComponent;
}
#RealizesFeature dependency from outputStage::euOutput to featEuMarket;
```

- **Requires** and **excludes** join two features (`RequiresFeature`, `ExcludesFeature`).
- A **release record** selects features (`#SelectsFeature`), and through them the variants it contains.
- A **design decision** weighs variants (`#Alternative`) and names the one it chose (`#Selected`).
- A variation point owns nothing but its variants. Put `status` and anything else on the variants.

## The Variability page

**Model › Variability** lists the releases, the variation points with their variants, and the
features with what they require, exclude, are realized by and are selected by.

Tick a feature on a release to select it. That writes the `#SelectsFeature` statement into the
release's file; clearing the tick removes it. Whatever is wrong with the selection shows on
the release as soon as the model has been rebuilt:

- an approved or released record selects a feature whose variant is still proposed;
- a selected feature needs a feature the record does not select, or two selected features exclude each other;
- two variants of one variation point are selected.

A statement that declares several links (`to a, b;`) cannot have one of them cleared from the page;
the page says so and leaves the file alone. Edit the source, or write one statement per link.
