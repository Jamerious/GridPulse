import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import LogInfo from './pages/loginfo'
import Homeowner from './pages/Homeowner'
import Navbar from './components/Navbar'
import Operator from './pages/Operator'

export const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      <Navbar />
      
      <Routes>
        
       {/*pathways for pages to take*/}

  <Route path='/' element={<Home />} />
  <Route path='/LogInfo' element={<LogInfo />} />
  <Route path='/Homeowner' element={<Homeowner />} />
  <Route path="/operator" element={<Operator />} />
  
</Routes>
    </div>
  )
}

export default App;

