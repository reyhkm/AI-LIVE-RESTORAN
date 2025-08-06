import LiveVoiceStream from './LiveVoiceStream';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Live Voice AI Stream (v2)</h1>
        <p>Dibangun dengan model Native Audio Gemini</p>
      </header>
      <main>
        <LiveVoiceStream />
      </main>
    </div>
  );
}

export default App;
