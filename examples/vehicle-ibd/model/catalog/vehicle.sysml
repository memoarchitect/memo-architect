// Original MEMO internal block diagram example inspired by GfSE VehicleConfiguration_b.
// See README.md for attribution and deliberately added control/power wiring.
package memo_vehicle_routing {
    private import memo_core_common::*;
    private import memo_architecture_logical_structure::*;
    private import memo_architecture_logical_interfaces::*;
    part vehicle : LogicalComponent {
        @MemoIdentity { :>> label = "Vehicle"; }
        part powertrain : LogicalComponent {
            @MemoIdentity { :>> label = "Powertrain"; }
            part fuelTank : LogicalComponent {
                @MemoIdentity { :>> label = "Fuel tank"; }
                out port fuelSupplyOut : LogicalPort;
            }
            part engine : LogicalComponent {
                @MemoIdentity { :>> label = "Engine"; }
                in port fuelSupplyIn : LogicalPort;
                out port drivePowerOut : LogicalPort;
                in port fuelCommandIn : LogicalPort;
                out port engineStatusOut : LogicalPort;
            }
            part transmission : LogicalComponent {
                @MemoIdentity { :>> label = "Transmission"; }
                in port drivePowerIn : LogicalPort;
                out port shaftTorqueOut : LogicalPort;
                in port gearCommandIn : LogicalPort;
                out port gearStatusOut : LogicalPort;
            }
            part driveshaft : LogicalComponent {
                @MemoIdentity { :>> label = "Driveshaft"; }
                in port shaftTorqueIn : LogicalPort;
                out port rearTorqueOut : LogicalPort;
            }
        }
        part rearAxle : LogicalComponent {
            @MemoIdentity { :>> label = "Rear axle assembly"; }
            part differential : LogicalComponent {
                @MemoIdentity { :>> label = "Differential"; }
                in port rearTorqueIn : LogicalPort;
                out port leftTorqueOut : LogicalPort;
                out port rightTorqueOut : LogicalPort;
            }
            part leftHalfAxle : LogicalComponent {
                @MemoIdentity { :>> label = "Left half axle"; }
                in port leftTorqueIn : LogicalPort;
                out port leftWheelTorqueOut : LogicalPort;
            }
            part rightHalfAxle : LogicalComponent {
                @MemoIdentity { :>> label = "Right half axle"; }
                in port rightTorqueIn : LogicalPort;
                out port rightWheelTorqueOut : LogicalPort;
            }
            part rearLeftWheel : LogicalComponent {
                @MemoIdentity { :>> label = "Rear left wheel"; }
                in port leftWheelTorqueIn : LogicalPort;
                out port rearLeftSenseOut : LogicalPort;
                in port rearLeftBrakeIn : LogicalPort;
                out port rearLeftRoadOut : LogicalPort;
            }
            part rearRightWheel : LogicalComponent {
                @MemoIdentity { :>> label = "Rear right wheel"; }
                in port rightWheelTorqueIn : LogicalPort;
                out port rearRightSenseOut : LogicalPort;
                in port rearRightBrakeIn : LogicalPort;
                out port rearRightRoadOut : LogicalPort;
            }
        }
        part frontAxle : LogicalComponent {
            @MemoIdentity { :>> label = "Front axle assembly"; }
            part steeringRack : LogicalComponent {
                @MemoIdentity { :>> label = "Steering rack"; }
                out port steerLeftOut : LogicalPort;
                out port steerRightOut : LogicalPort;
                in port steerCommandIn : LogicalPort;
            }
            part frontLeftWheel : LogicalComponent {
                @MemoIdentity { :>> label = "Front left wheel"; }
                in port steerLeftIn : LogicalPort;
                out port frontLeftSenseOut : LogicalPort;
                in port frontLeftBrakeIn : LogicalPort;
                out port frontLeftRoadOut : LogicalPort;
            }
            part frontRightWheel : LogicalComponent {
                @MemoIdentity { :>> label = "Front right wheel"; }
                in port steerRightIn : LogicalPort;
                out port frontRightSenseOut : LogicalPort;
                in port frontRightBrakeIn : LogicalPort;
                out port frontRightRoadOut : LogicalPort;
            }
        }
        part electronics : LogicalComponent {
            @MemoIdentity { :>> label = "Vehicle electronics"; }
            part controller : LogicalComponent {
                @MemoIdentity { :>> label = "Vehicle controller"; }
                in port driverDemandIn : LogicalPort;
                out port fuelCommandOut : LogicalPort;
                out port gearCommandOut : LogicalPort;
                out port steerCommandOut : LogicalPort;
                out port brakeCoordinationOut : LogicalPort;
                in port wheelStatusIn : LogicalPort;
                in port brakeFeedbackIn : LogicalPort;
                in port controllerPowerIn : LogicalPort;
                in port engineStatusIn : LogicalPort;
                in port gearStatusIn : LogicalPort;
            }
            part battery : LogicalComponent {
                @MemoIdentity { :>> label = "12 V battery"; }
                out port batteryPowerOut : LogicalPort;
            }
            part powerDistribution : LogicalComponent {
                @MemoIdentity { :>> label = "Power distribution"; }
                in port batteryPowerIn : LogicalPort;
                out port controllerPowerOut : LogicalPort;
                out port brakePowerOut : LogicalPort;
                out port sensorPowerOut : LogicalPort;
            }
            part brakeController : LogicalComponent {
                @MemoIdentity { :>> label = "Brake controller"; }
                in port brakeDemandIn : LogicalPort;
                in port brakeCoordinationIn : LogicalPort;
                out port brakeFeedbackOut : LogicalPort;
                in port brakePowerIn : LogicalPort;
                out port frontLeftBrakeOut : LogicalPort;
                out port frontRightBrakeOut : LogicalPort;
                out port rearLeftBrakeOut : LogicalPort;
                out port rearRightBrakeOut : LogicalPort;
            }
            part wheelSensors : LogicalComponent {
                @MemoIdentity { :>> label = "Wheel speed sensors"; }
                out port wheelStatusOut : LogicalPort;
                in port sensorPowerIn : LogicalPort;
                in port frontLeftSenseIn : LogicalPort;
                in port frontRightSenseIn : LogicalPort;
                in port rearLeftSenseIn : LogicalPort;
                in port rearRightSenseIn : LogicalPort;
            }
        }
    }
    part driver : LogicalComponent {
        @MemoIdentity { :>> label = "Driver controls"; }
        out port driverDemandOut : LogicalPort;
        out port brakeDemandOut : LogicalPort;
    }
    part road : LogicalComponent {
        @MemoIdentity { :>> label = "Road contact"; }
        in port frontLeftRoadIn : LogicalPort;
        in port frontRightRoadIn : LogicalPort;
        in port rearLeftRoadIn : LogicalPort;
        in port rearRightRoadIn : LogicalPort;
    }

    // Native package-level interfaces wire the nested part ports.
    interface fuelSupply : ComponentExchange connect vehicle.powertrain.fuelTank.fuelSupplyOut to vehicle.powertrain.engine.fuelSupplyIn;
    interface drivePower : ComponentExchange connect vehicle.powertrain.engine.drivePowerOut to vehicle.powertrain.transmission.drivePowerIn;
    interface shaftTorque : ComponentExchange connect vehicle.powertrain.transmission.shaftTorqueOut to vehicle.powertrain.driveshaft.shaftTorqueIn;
    interface rearTorque : ComponentExchange connect vehicle.powertrain.driveshaft.rearTorqueOut to vehicle.rearAxle.differential.rearTorqueIn;
    interface leftTorque : ComponentExchange connect vehicle.rearAxle.differential.leftTorqueOut to vehicle.rearAxle.leftHalfAxle.leftTorqueIn;
    interface rightTorque : ComponentExchange connect vehicle.rearAxle.differential.rightTorqueOut to vehicle.rearAxle.rightHalfAxle.rightTorqueIn;
    interface leftWheelTorque : ComponentExchange connect vehicle.rearAxle.leftHalfAxle.leftWheelTorqueOut to vehicle.rearAxle.rearLeftWheel.leftWheelTorqueIn;
    interface rightWheelTorque : ComponentExchange connect vehicle.rearAxle.rightHalfAxle.rightWheelTorqueOut to vehicle.rearAxle.rearRightWheel.rightWheelTorqueIn;
    interface steerLeft : ComponentExchange connect vehicle.frontAxle.steeringRack.steerLeftOut to vehicle.frontAxle.frontLeftWheel.steerLeftIn;
    interface steerRight : ComponentExchange connect vehicle.frontAxle.steeringRack.steerRightOut to vehicle.frontAxle.frontRightWheel.steerRightIn;
    interface driverDemand : ComponentExchange connect driver.driverDemandOut to vehicle.electronics.controller.driverDemandIn;
    interface fuelCommand : ComponentExchange connect vehicle.electronics.controller.fuelCommandOut to vehicle.powertrain.engine.fuelCommandIn;
    interface gearCommand : ComponentExchange connect vehicle.electronics.controller.gearCommandOut to vehicle.powertrain.transmission.gearCommandIn;
    interface steerCommand : ComponentExchange connect vehicle.electronics.controller.steerCommandOut to vehicle.frontAxle.steeringRack.steerCommandIn;
    interface brakeDemand : ComponentExchange connect driver.brakeDemandOut to vehicle.electronics.brakeController.brakeDemandIn;
    interface brakeCoordination : ComponentExchange connect vehicle.electronics.controller.brakeCoordinationOut to vehicle.electronics.brakeController.brakeCoordinationIn;
    interface wheelStatus : ComponentExchange connect vehicle.electronics.wheelSensors.wheelStatusOut to vehicle.electronics.controller.wheelStatusIn;
    interface brakeFeedback : ComponentExchange connect vehicle.electronics.brakeController.brakeFeedbackOut to vehicle.electronics.controller.brakeFeedbackIn;
    interface batteryPower : ComponentExchange connect vehicle.electronics.battery.batteryPowerOut to vehicle.electronics.powerDistribution.batteryPowerIn;
    interface controllerPower : ComponentExchange connect vehicle.electronics.powerDistribution.controllerPowerOut to vehicle.electronics.controller.controllerPowerIn;
    interface brakePower : ComponentExchange connect vehicle.electronics.powerDistribution.brakePowerOut to vehicle.electronics.brakeController.brakePowerIn;
    interface sensorPower : ComponentExchange connect vehicle.electronics.powerDistribution.sensorPowerOut to vehicle.electronics.wheelSensors.sensorPowerIn;
    interface engineStatus : ComponentExchange connect vehicle.powertrain.engine.engineStatusOut to vehicle.electronics.controller.engineStatusIn;
    interface gearStatus : ComponentExchange connect vehicle.powertrain.transmission.gearStatusOut to vehicle.electronics.controller.gearStatusIn;
    interface frontLeftSense : ComponentExchange connect vehicle.frontAxle.frontLeftWheel.frontLeftSenseOut to vehicle.electronics.wheelSensors.frontLeftSenseIn;
    interface frontRightSense : ComponentExchange connect vehicle.frontAxle.frontRightWheel.frontRightSenseOut to vehicle.electronics.wheelSensors.frontRightSenseIn;
    interface rearLeftSense : ComponentExchange connect vehicle.rearAxle.rearLeftWheel.rearLeftSenseOut to vehicle.electronics.wheelSensors.rearLeftSenseIn;
    interface rearRightSense : ComponentExchange connect vehicle.rearAxle.rearRightWheel.rearRightSenseOut to vehicle.electronics.wheelSensors.rearRightSenseIn;
    interface frontLeftBrake : ComponentExchange connect vehicle.electronics.brakeController.frontLeftBrakeOut to vehicle.frontAxle.frontLeftWheel.frontLeftBrakeIn;
    interface frontRightBrake : ComponentExchange connect vehicle.electronics.brakeController.frontRightBrakeOut to vehicle.frontAxle.frontRightWheel.frontRightBrakeIn;
    interface rearLeftBrake : ComponentExchange connect vehicle.electronics.brakeController.rearLeftBrakeOut to vehicle.rearAxle.rearLeftWheel.rearLeftBrakeIn;
    interface rearRightBrake : ComponentExchange connect vehicle.electronics.brakeController.rearRightBrakeOut to vehicle.rearAxle.rearRightWheel.rearRightBrakeIn;
    interface frontLeftRoad : ComponentExchange connect vehicle.frontAxle.frontLeftWheel.frontLeftRoadOut to road.frontLeftRoadIn;
    interface frontRightRoad : ComponentExchange connect vehicle.frontAxle.frontRightWheel.frontRightRoadOut to road.frontRightRoadIn;
    interface rearLeftRoad : ComponentExchange connect vehicle.rearAxle.rearLeftWheel.rearLeftRoadOut to road.rearLeftRoadIn;
    interface rearRightRoad : ComponentExchange connect vehicle.rearAxle.rearRightWheel.rearRightRoadOut to road.rearRightRoadIn;
}
