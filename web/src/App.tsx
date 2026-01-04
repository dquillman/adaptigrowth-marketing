import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';
import ExamList from './pages/ExamList';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';

import About from './pages/About';
import Help from './pages/Help';
import Pricing from './pages/Pricing';
import Success from './pages/Success';
import SimulatorIntro from './pages/SimulatorIntro';
import Simulator from './pages/Simulator';
import SimulatorResults from './pages/SimulatorResults';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('App mounted, setting up auth listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error('Auth error:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    console.log('App is loading...');
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  console.log('App rendering routes, user:', user);
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/exams" element={user ? <ExamList /> : <Navigate to="/login" />} />
          <Route path="/quiz" element={user ? <Quiz /> : <Navigate to="/login" />} />
          <Route path="/quiz/:examId" element={user ? <Quiz /> : <Navigate to="/login" />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={user ? <Pricing /> : <Navigate to="/login" />} />
          <Route path="/success" element={user ? <Success /> : <Navigate to="/login" />} />
          <Route path="/help" element={user ? <Help /> : <Navigate to="/login" />} />
          <Route path="/simulator" element={user ? <SimulatorIntro /> : <Navigate to="/login" />} />
          <Route path="/simulator/exam" element={user ? <Simulator /> : <Navigate to="/login" />} />
          <Route path="/simulator/results" element={user ? <SimulatorResults /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
