import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { DiagramCanvas } from '../src/views/DiagramCanvas';
import { DiagramEmbedContext } from '../src/diagram/diagram-embed-context';
import { useModelStore } from '../src/store/model-store';
import { connectWebSocket } from '../src/store/ws-client';
function Fixture(){
 const model=useModelStore(s=>s.model);
 React.useEffect(()=>connectWebSocket(),[]);
 if(!model)return <div>Loading fixture through normal websocket bootstrap…</div>;
 return <div style={{height:'100vh',display:'flex'}}><DiagramEmbedContext.Provider value={{diagramId:'vehicleRoutingPilot',readOnly:true}}><DiagramCanvas/></DiagramEmbedContext.Provider></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
