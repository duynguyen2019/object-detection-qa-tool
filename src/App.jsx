import React, { useState, useEffect } from 'react';
import MainImage from './components/MainImage.jsx'; // Updated import
import './styles/MainImage.css'; // Ensure correct path and capitalization

function App() {
  const [activeTab, setActiveTab] = useState("image"); // Manage active tab state
  const [showModal, setShowModal] = useState(false); // Modal state

  useEffect(() => {
    // Show modal when app first launches
    setShowModal(true);
  }, []);

  return (
    <div className="App d-flex flex-column min-vh-100">
      {/* Instruction Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Instructions</h2>
            <p>Welcome! Here is how to use the app:</p>
            <ol>
              <li>Download demo data, unzip, and drop the images to the drop zone</li>
              <li>Use the drawing tool to box the seastars that the app miss</li>
              <li>When you are done, click Finish Session/Upload data to Training Set to database</li>
              <li>Training process will be run weekly with the new training dataset</li>
              <li>Check back next week for new stats</li>
            </ol>
            <button onClick={() => setShowModal(false)} className="close-btn">
              Got it!
            </button>
          </div>
        </div>
      )}

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
