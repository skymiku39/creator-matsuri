import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EditorPage } from './pages/EditorPage'
import { TutorialPage } from './pages/TutorialPage'
import { SimulatePage } from './pages/SimulatePage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/simulate" element={<SimulatePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
