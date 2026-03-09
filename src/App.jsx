import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Browse from './pages/Browse'
import Quiz from './pages/Quiz'
import Progress from './pages/Progress'
import AudioTrim from './pages/admin/AudioTrim'
import AudioRecord from './pages/admin/AudioRecord'
import BottomNav from './components/BottomNav'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin tools — no nav bar */}
        <Route path="/admin/audio" element={<AudioTrim />} />
        <Route path="/admin/record" element={<AudioRecord />} />

        {/* Student app — wrapped with bottom nav */}
        <Route path="/*" element={<StudentLayout />} />
      </Routes>
    </BrowserRouter>
  )
}

function StudentLayout() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/browse" replace />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/progress" element={<Progress />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
