import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ChatPage from "./ChatPage";

function App() {
  return (
    <Router>
      <div style={{ padding: "1rem" }}>
        <nav>
          <Link to="/chat" style={{ fontSize: "1.2rem" }}>
            Go to Chat
          </Link>
        </nav>

        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/" element={<h2>Welcome! Click "Go to Chat"</h2>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
