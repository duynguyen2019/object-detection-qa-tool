// src/App.jsx
import React, { useState } from 'react';
import MainImage from './components/MainImage.jsx'; // Updated import
import './styles/MainImage.css'; // Ensure correct path and capitalization

function App() {
  const [activeTab, setActiveTab] = useState("image"); // Manage active tab state

  return (
    <div className="App d-flex flex-column min-vh-100">
      {/* Tabs Navigation */}
      <div className="tabs d-flex border-bottom">
        <button
          className={`tab-button ${activeTab === "image" ? "active" : ""}`}
          onClick={() => setActiveTab("image")}
        >
          Image Processing
        </button>
        {/* <button
          className={`tab-button ${activeTab === "video" ? "active" : ""}`}
          onClick={() => setActiveTab("video")}
        >
          Video Processing
        </button> */}
      </div>

      {/* Tab Content */}
      <div className="tab-content flex-grow-1 d-flex">
        {activeTab === "image" && (
          <div className="image-processing w-100 h-100">
            <MainImage /> {/* Updated Image Processing Component */}
          </div>
        )}
        {activeTab === "video" && (
          <div className="video-processing w-100 h-100 d-flex flex-column align-items-center justify-content-center">
            <h2>Video Processing</h2>
            <p>Under development</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
