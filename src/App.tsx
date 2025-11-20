import { ReactFlowProvider } from 'reactflow';
import GraphView from './components/GraphView';
import Topbar from './components/Topbar';
import Pinboard from './components/Pinboard';
import Timer from './components/Timer';
import Chat from './components/Chat';
import CookieConsent from './components/CookieConsent';
import './App.css';

function App() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ flexGrow: 1, position: 'relative', marginTop: '64px' }}>
        <ReactFlowProvider>
          <GraphView />
        </ReactFlowProvider>
        <Pinboard />
        <Timer />
        <Chat />
      </div>
      <CookieConsent />
    </div>
  );
}

export default App;

