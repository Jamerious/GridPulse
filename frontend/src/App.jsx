import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import LogInfo from './pages/LogInfo'
import Homeowner from './pages/Homeowner'
import Navbar from './components/Navbar'
import Operator from './pages/Operator'
import { ProtectedRoute, PendingAuthRoute } from './components/ProtectedRoute'

export const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      <Navbar />
      
      <Routes>
        {/* Public Landing / Login Page */}
        <Route path='/' element={<Home />} />

        {/* Step 2: Role selection (requires credentials entered on /) */}
        <Route
          path='/LogInfo'
          element={
            <PendingAuthRoute>
              <LogInfo />
            </PendingAuthRoute>
          }
        />

        {/* Protected Homeowner Dashboard (requires submitted login) */}
        <Route
          path='/Homeowner'
          element={
            <ProtectedRoute>
              <Homeowner />
            </ProtectedRoute>
          }
        />

        {/* Protected Operator Dashboard (requires submitted login) */}
        <Route
          path='/operator'
          element={
            <ProtectedRoute>
              <Operator />
            </ProtectedRoute>
          }
        />

        {/* Fallback to Home */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </div>
  )
}

export default App;

