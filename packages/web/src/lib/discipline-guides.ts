export type EngineeringLayer = 'layerImplementation' | 'layerRealization';
export type DisciplineMode = 'all' | 'software' | 'hardware' | 'mechanical';

export interface GuideTask {
    title: string;
    instructions: string;
    kinds: string[];
}

export interface PersonalGuide {
    id: string;
    title: string;
    tasks: GuideTask[];
}

export const disciplineModes = [
    { id: 'all', title: 'All work' },
    { id: 'software', title: 'Software' },
    { id: 'hardware', title: 'Hardware' },
    { id: 'mechanical', title: 'Mechanical' },
] as const;

const task = (title: string, instructions: string, ...kinds: string[]): GuideTask => ({ title, instructions, kinds });

export const disciplineTasks: Record<EngineeringLayer, Record<Exclude<DisciplineMode, 'all'>, GuideTask[]>> = {
    layerImplementation: {
        software: [
            task('Define software responsibilities', 'Describe what each module or component does and link it to the logical components it realizes.', 'SoftwareSystem', 'SoftwareModule', 'SoftwareComponent'),
            task('Describe software interfaces', 'Record exchanged data, direction, and the software parts that use each interface.', 'SoftwarePort', 'SoftwareInterface', 'DataModel'),
        ],
        hardware: [
            task('Define hardware assemblies', 'Describe the hardware assemblies and components and link their logical responsibilities.', 'HardwareAssembly', 'HardwareComponent', 'ElectricalComponent', 'Sensor', 'Actuator'),
            task('Record power and connections', 'Describe power supplies and the cables and connectors between hardware items.', 'PowerSupply', 'Cable', 'PhysicalConnectorPart'),
        ],
        mechanical: [
            task('Define mechanical parts', 'Describe what each mechanical part or enclosure does, its materials, and how it is assembled.', 'MechanicalPart', 'Enclosure'),
            task('Review mounting and clearances', 'Document attachment points, clearances, and service access in the mechanical model or its referenced design evidence.', 'MechanicalPart', 'Enclosure'),
        ],
    },
    layerRealization: {
        software: [
            task('Package the software', 'Create deployment units and link each software module that builds into them.', 'SoftwareDeploymentUnit'),
            task('Place the software at runtime', 'Deploy each unit to a processing node and record the runtime environment the node provides.', 'ProcessingNode', 'RuntimeEnvironment'),
        ],
        hardware: [
            task('Place processing and memory', 'Identify the processing nodes and memory devices that realize the hardware design.', 'ProcessingNode', 'MemoryDevice'),
            task('Describe physical connections', 'Identify the ports and interfaces used by devices and trace the flows they carry.', 'PhysicalPort', 'PhysicalInterface', 'PhysicalFlow'),
        ],
        mechanical: [
            task('Review installed mechanical parts', 'Open the mechanical parts and enclosures from Implementation. Check installation, mounting, fit and service access against the physical architecture.', 'MechanicalPart', 'Enclosure'),
            task('Review physical interfaces', 'Trace mechanical interfaces, connections, and required clearances in the assembled design.', 'PhysicalPort', 'PhysicalInterface'),
        ],
    },
};

export function rosTasks(layer: EngineeringLayer): GuideTask[] {
    if (layer === 'layerRealization') return [
        task('Package the ROS nodes', 'Record which ROS nodes are included in each deployment unit and link the owning software modules to that unit.', 'RosNode', 'SoftwareDeploymentUnit', 'SoftwareModule'),
        task('Place nodes and runtime', 'Link the unit to its processing node. Record the runtime environment and the launch configuration used there.', 'ProcessingNode', 'RuntimeEnvironment'),
        task('Verify topic connections', 'Check node namespaces, resolved topic names, message contracts, publisher/subscriber direction, and compatible QoS.', 'RosTopicInterface', 'RosPublisher', 'RosSubscriber', 'RosMessage'),
    ];
    return [
        task('Describe each node and its functions', 'Record the node name and namespace, its responsibilities and functions, lifecycle behavior, and inputs and outputs.', 'RosNode', 'ComponentFunction', 'SystemFunction'),
        task('Describe each topic and message', 'Record the topic name, message contract, publishing and subscribing nodes, and their offered and requested QoS.', 'RosTopicInterface', 'RosMessage', 'RosPublisher', 'RosSubscriber'),
        task('Describe services and actions', 'Record which node provides each service or action, which nodes call it, and the request, response, goal, feedback, and result contracts as applicable.', 'RosServiceClient', 'RosServiceServer', 'RosActionClient', 'RosActionServer'),
    ];
}

export function loadPersonalGuides(key: string): PersonalGuide[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((guide): guide is PersonalGuide => guide && typeof guide.id === 'string'
            && typeof guide.title === 'string' && Array.isArray(guide.tasks) && guide.tasks.every((item: GuideTask) =>
                item && typeof item.title === 'string' && typeof item.instructions === 'string'
                && Array.isArray(item.kinds) && item.kinds.every(kind => typeof kind === 'string')));
    } catch { return []; }
}
