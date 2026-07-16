# Worked GPCA Example

The bundled Generic Patient-Controlled Analgesia pump demonstrates how MEMO
connects context, requirements, architecture, behavior, risk, cybersecurity,
verification, and document views.

## Read it as scenarios, not folders

Start with the patient-bolus scenario:

1. **Context:** the patient interacts with the pump in a hospital ward.
2. **Operation:** the patient requests a bolus during therapy.
3. **System analysis:** a patient-bolus functional chain coordinates sensing,
   limit enforcement, pump command, and event logging.
4. **Requirements:** dose and lockout limits constrain the response.
5. **Architecture:** logical, software, and physical elements own each function.
6. **Risk:** overdose and other hazards drive controls and requirements.
7. **Assurance:** verification cases check requirements and controls.

Then repeat the exercise for alarm response or startup. Comparing scenarios
shows which elements are reused and which are scenario-specific.

## Useful views

| Question | View to open |
|---|---|
| Who exchanges information or material with the pump? | System context |
| What happens when a patient requests a bolus? | Operational sequence / functional chain |
| Which element implements limit enforcement? | Function allocation |
| What leads from a fault to potential harm? | Risk chain or FMEA |
| Which requirements or controls lack test coverage? | Verification coverage |
| Which records feed a review document? | Document views |

## Source trail

The example source is under
`memo-tools/memo/examples/gpca-pump/model`. Catalog files define canonical
elements; `catalog/gpca_trace.sysml` connects them; `views` defines purposeful
selections.

Use the model as a pattern library. Do not reuse its device-specific
requirements, risk estimates, or evidence as conclusions for another product.
