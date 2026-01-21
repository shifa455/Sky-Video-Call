
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import Authentication from './pages/authentication';
import HomeComponent from './pages/home';
import History from './pages/history';
import VideoMeetComponent from './pages/VideoMeet';
import { AuthProvider } from './contexts/AuthContext';
import withAuth from './utils/withAuth';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path='/' element={<LandingPage />} />
          <Route path='/auth' element={<Authentication />} />

          {/* Protected Routes */}
          <Route path='/home' element={<HomeComponent />} />
          <Route path='/history' element={<History />} />
          <Route path='/:url' element={<VideoMeetComponent />} />

          {/* Optional: 404 Page */}
          <Route path='*' element={<h1>Page Not Found</h1>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;




// import './App.css';
// import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
// import LandingPage from './pages/landingPage';
// import Authentication from './pages/authentication';
// import { AuthProvider } from './contexts/AuthContext';
// import VideoMeetComponent from './pages/VideoMeet';
// import HomeComponent from './pages/home';
// import History from './pages/history';

// function App() {
//   return (
//     <div className="App">
//       <Router>
//         <AuthProvider>
//           <Routes>
//             {/* Public routes */}
//             <Route path='/' element={<LandingPage />} />
//             <Route path='/auth' element={<Authentication />} />

//             {/* Protected routes */}
//             <Route path='/home' element={<HomeComponent />} />
//             <Route path='/history' element={<History />} />
//             <Route path='/:url' element={<VideoMeetComponent />} />
//           </Routes>
//         </AuthProvider>
//       </Router>
//     </div>
//   );
// }

// export default App;
