# Example Improvements for a Medical Device Modeling Library

## Purpose

This document captures improvements to example models so that the library is easier to understand, easier to adopt, and more representative of real medical device development.

Examples should not only demonstrate syntax. They should demonstrate modeling intent, traceability patterns, document generation paths, and extension mechanisms.

## Design Principles for Examples

Examples should be:

- realistic enough to be useful
- small enough to understand quickly
- layered so users can grow from simple to advanced
- traceable across architecture, risk, verification, and cybersecurity
- reusable as reference patterns

## 1. Add Tiered Example Complexity

The example library should include progressively richer examples.

### Level 1: Minimal conceptual example

A very small model used to explain the core ontology structure.

Recommended content:

- device context
- a few requirements
- a few architecture elements
- one hazard
- one control
- one verification case
- one simple view

### Level 2: Single-device reference example

A fuller example demonstrating a real device structure and traceability pattern.

Examples:

- infusion pump
- patient monitor
- therapy controller

### Level 3: Advanced connected-device example

A more advanced example that includes:

- software and hardware structure
- cybersecurity
- trust boundaries
- data flows
- verification evidence
- document views

## 2. Strengthen the Existing GPCA Example

The GPCA-style example should be expanded so it demonstrates the intended value of the library, not only package usage.

Recommended improvements:

- explicit user needs and design inputs
- more visible software item hierarchy
- closed-loop hazard-control-requirement-verification traceability
- cyber threat model for connected functions
- example trust boundary crossings
- verification and evidence instances
- document-oriented views tied to requirements, risk, and cyber content

## 3. Add a Full Traceability Walkthrough Example

At least one example should demonstrate a full traceability thread.

Recommended walkthrough:

1. user need identified
2. design input derived
3. hazard and risk identified
4. control measure defined
5. requirement derived
6. architecture element allocated
7. verification case created
8. evidence produced
9. document views generated

This is one of the most important examples because it shows how the model supports real compliance workflows.

## 4. Add a Cybersecurity Walkthrough Example

The cybersecurity example should be expanded into a full scenario.

Recommended path:

1. identify asset
2. identify trust boundary
3. define threat
4. define vulnerability
5. define threat scenario
6. derive cyber risk
7. define mitigation
8. derive security requirement
9. define security verification
10. create assessment view

This helps users understand how cybersecurity is meant to work as a first-class layer.

## 5. Add a Use-Context / Clinical Scenario Example

A model library for medical devices should demonstrate how clinical context affects system design.

Recommended content:

- user roles
- workflow steps
- use environment
- alarm or interaction concern
- usability or operational hazard
- trace to design input and verification

This will make the library stronger for human factors and context-driven modeling.

## 6. Add Document-Oriented Example Views

Examples should include not only semantic elements but also document-oriented outputs.

Recommended example views:

- system overview view
- software architecture view
- hazard-control trace view
- cybersecurity assessment view
- verification evidence view
- QMSR/DHF section example

This makes the documentation value of the library much more concrete.

## 7. Show How to Extend Defaults

Examples should demonstrate how users can extend the base library without changing the core ontology.

Recommended extension examples:

- define a product-specific viewpoint derived from a default viewpoint
- define a product-specific view using selection queries
- add a product-specific cyber threat category
- add a product-specific evidence artifact

This is important for adoption because users need to see how customization is intended to work.

## 8. Add Example Queries

Because views increasingly depend on model-backed selection, the examples should include sample queries.

Recommended examples:

- all hazards associated with subsystem X
- all unverified requirements
- all software items of safety class C
- all threats crossing external trust boundaries
- all controls without linked evidence

This will help future tooling and make view generation more understandable.

## 9. Add Good Naming and Packaging Examples

Users often copy examples directly into real repositories.

Examples should therefore demonstrate:

- package naming conventions
- file organization conventions
- import structure
- example layering
- view and viewpoint placement
- product extension structure

## 10. Add Example Migration Notes

Because the library is intended to evolve, examples should include notes on how to upgrade them when the package changes.

Recommended content:

- which package release the example targets
- whether it uses default or extended viewpoints
- whether it relies on cyber layer constructs
- what parts are illustrative vs recommended production usage

## 11. Add Archetype-Based Examples

It would be valuable to ship multiple examples corresponding to common medical device classes.

Recommended example set:

- infusion pump
- patient monitor
- surgical robot subsystem
- mapping/ablation subsystem
- connected gateway or service adapter

These do not all need to be equally detailed, but even a moderate set of examples would make the library easier to understand and reuse.

## 12. Recommended Example Priorities

### Highest priority

- strengthen GPCA example
- add full traceability walkthrough
- add cyber walkthrough example
- add document-oriented views

### Medium priority

- add clinical/use-context example
- add extension/customization example
- add query examples

### Later priority

- add multiple device archetype examples
- add migration-oriented example notes

## Summary

Good examples are one of the strongest adoption tools for a medical device modeling library.

The examples should show:

- how the ontology is intended to be used
- how views and viewpoints work
- how risk and cyber integrate with architecture
- how traceability closes the loop
- how documents and evidence can be generated from the model
