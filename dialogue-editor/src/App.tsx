import { FlowCanvas } from './components/FlowCanvas'
import { Inspector } from './components/Inspector'
import { Toolbar } from './components/Toolbar'
import { Toolbox } from './components/Toolbox'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Toolbar />
      <div className="workspace">
        <Toolbox />
        <FlowCanvas />
        <Inspector />
      </div>
    </div>
  )
}

export default App
