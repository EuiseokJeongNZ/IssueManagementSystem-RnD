// App.js
import './App.css';
import React from "react";
import { ColorModeContext, useMode } from './theme';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMediaQuery } from "@mui/material";
import { Routes, Route, useLocation } from 'react-router-dom';

import Topbar from './scenes/Navbar/Topbar';
import Sidebar from './scenes/Navbar/Sidebar1';

import Dashboard from './scenes/dashboard';
// import Team from './scenes/Students';
import Contacts from './scenes/Contacts';
import Form from './scenes/NewAdmission';
import Calendar from './scenes/Timetable';
import Bar from './scenes/ClassProgress';
import Pie from './scenes/StudentRecords';
import Line from './scenes/ClassRecords';

// ✅ 로그인(역할 선택) 화면
import ChooseUser from './scenes/ChooseUser.jsx';

function App() {
  const [theme, colorMode] = useMode();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const location = useLocation();
  const isLoginRoute = location.pathname === "/";   // ✅ '/'면 로그인 화면

  if (isMobile) {
    return (
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className="app">
            {/* 모바일에선 로그인 화면도 Topbar 없이 깔끔하게 */}
            <main className="content">
              <Routes>
                {/* ✅ 처음: 로그인 */}
                <Route path="/" element={<ChooseUser />} />
                {/* ✅ 대시보드는 /dashboard 로 이동 */}
                <Route path="/dashboard" element={<><Topbar /><Dashboard /></>} />
                {/* <Route path="/team" element={<><Topbar /><Team /></>} /> */}
                <Route path="/contacts" element={<><Topbar /><Contacts /></>} />
                <Route path="/form" element={<><Topbar /><Form /></>} />
                <Route path="/calendar" element={<><Topbar /><Calendar /></>} />
                <Route path="/bar" element={<><Topbar /><Bar /></>} />
                <Route path="/pie" element={<><Topbar /><Pie /></>} />
                <Route path="/line" element={<><Topbar /><Line /></>} />
              </Routes>
            </main>
          </div>
        </ThemeProvider>
      </ColorModeContext.Provider>
    );
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app">
          {/* ✅ 로그인 화면('/')에선 사이드바 숨김 */}
          {!isLoginRoute && <Sidebar />}

          <main className="content">
            {/* ✅ 로그인 화면('/')에선 탑바 숨김 */}
            {!isLoginRoute && <Topbar />}

            <Routes>
              {/* ✅ 처음: 로그인 */}
              <Route path="/" element={<ChooseUser />} />

              {/* ✅ 보호화면들은 기존 그대로, 다만 대시보드는 /dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
              {/* <Route path="/team" element={<Team />} /> */}
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/form" element={<Form />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/bar" element={<Bar />} />
              <Route path="/pie" element={<Pie />} />
              <Route path="/line" element={<Line />} />
            </Routes>
          </main>
        </div>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
