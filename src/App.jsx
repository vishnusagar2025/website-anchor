import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import PipelineAnalyzer from './pages/PipelineAnalyzer'
import PrePushPredictor from './pages/PrePushPredictor'
import LogIntelligence from './pages/LogIntelligence'
import AiAssistant from './pages/AiAssistant'

export default function App() {
  return (
    <div className="flex min-h-screen bg-anchor-dark">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<PipelineAnalyzer />} />
          <Route path="/predictor" element={<PrePushPredictor />} />
          <Route path="/logs" element={<LogIntelligence />} />
          <Route path="/assistant" element={<AiAssistant />} />
        </Routes>
      </main>
    </div>
  )
}
