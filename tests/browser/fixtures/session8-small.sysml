// Disposable renderer fixture; geometry and routing acceptance is separate from rules.
package memo_vehicle_routing {
    private import memo_core_common::*;
    private import memo_architecture_logical_structure::*;
    private import memo_architecture_logical_interfaces::*;
    part vehicle : LogicalComponent {
        @MemoIdentity { :>> label = "Outer assembly"; }
        part powertrain : LogicalComponent {
            @MemoIdentity { :>> label = "Middle assembly"; }
            part engine : LogicalComponent {
                @MemoIdentity { :>> label = "Nested leaf"; }
                out port internalOut : LogicalPort;
                out port externalOut : LogicalPort;
            }
            part fuelTank : LogicalComponent {
                @MemoIdentity { :>> label = "Nested peer"; }
                in port internalIn : LogicalPort;
            }
        }
    }
    part road : LogicalComponent {
        @MemoIdentity { :>> label = "External peer"; }
        in port externalIn : LogicalPort;
    }
    interface internal : ComponentExchange connect vehicle.powertrain.engine.internalOut to vehicle.powertrain.fuelTank.internalIn;
    interface external : ComponentExchange connect vehicle.powertrain.engine.externalOut to road.externalIn;
}
