// src/components/ProcessedVideoArea.jsx
import React from 'react';

function ProcessedVideoArea({ isProcessing, processedVideo, processedVideoRef, videoContainerRef }) {
  return (
    <div className="processed-video-area" ref={videoContainerRef}>
      {isProcessing ? (
        <div className="processing-overlay">
          <p>Processing Video...</p>
          {/* You can add a spinner or loader here */}
        </div>
      ) : processedVideo ? (
        <video src={processedVideo} controls width="300" ref={processedVideoRef} />
      ) : (
        <p>Processed video will appear here</p>
      )}
    </div>
  );
}

export default ProcessedVideoArea;
