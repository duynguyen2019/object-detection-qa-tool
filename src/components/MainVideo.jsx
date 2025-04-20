// src/components/MainVideo.jsx
import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';

// Import the video-specific components
import UploadVideoArea from './UploadVideoArea';
import ProcessedVideoArea from './ProcessedVideoArea';
// import TopBarVideo from './TopBarVideo'; // Optional: If you have a top bar for video
// Import other necessary components as needed

function MainVideo() {
  // =============== State Management ===============
  const [uploadedVideos, setUploadedVideos] = useState([]); // Array to store uploaded video files
  const [processedResults, setProcessedResults] = useState([]);
  const [uploadedVideo, setUploadedVideo] = useState(null); // The raw video displayed in the upload area
  const [processedVideo, setProcessedVideo] = useState(null); // The processed video (e.g., with overlays)
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(null);

  // References
  const videoContainerRef = useRef(null);
  const processedVideoRef = useRef(null);

  // =============== Video Upload Handler ===============
  const onVideoDrop = useCallback((acceptedFiles) => {
    // Filter video files based on their extension
    const validExtensions = ['mp4', 'avi', 'mov', 'mkv'];

    const filteredFiles = acceptedFiles.filter((file) => {
      const extension = file.name.split('.').pop().toLowerCase();
      if (validExtensions.includes(extension)) {
        return true;
      } else {
        alert(`Invalid file type: ${file.name}. Please upload .mp4, .avi, .mov, or .mkv files.`);
        return false;
      }
    });

    if (filteredFiles.length > 0) {
      // For simplicity, handle one video at a time. Modify as needed.
      const videoFile = filteredFiles[0];
      const videoURL = URL.createObjectURL(videoFile);
      setUploadedVideo(videoURL);
      setUploadedVideos((prev) => [...prev, videoFile]);

      // Prepare form data for backend upload
      const formData = new FormData();
      formData.append('video', videoFile);

      // Send video to the server for processing
      setIsProcessing(true);
      axios.post('/video-processing/process', formData)
        .then((response) => {
          if (response.data && response.data.results) {
            const newResults = response.data.results;
            setProcessedResults((prev) => [...prev, ...newResults]);

            // Default to the first processed video if none selected
            if (newResults.length > 0 && currentVideoIndex === null) {
              const processedVideoUrl = newResults[0].processed_video_url;
              setProcessedVideo(processedVideoUrl);
              setCurrentVideoIndex(0);
            }
          }
          setIsProcessing(false);
        })
        .catch((error) => {
          console.error('Video processing error:', error);
          setIsProcessing(false);
        });
    }
  }, [currentVideoIndex]);

  // =============== Video Selection Handler ===============
  const handleVideoSelection = (index) => {
    setCurrentVideoIndex(index);
    const item = processedResults[index];
    setProcessedVideo(item.processed_video_url);
    setUploadedVideo(item.original_video_url); // Assuming the original video URL is provided
    // Handle any other state updates as needed
  };

  // =============== Render ===============
  return (
    <div className="main-wrapper">
      {/* Top Bar (Optional) */}
      {/* <TopBarVideo /> */}

      {/* Main Container */}
      <div className="main-container d-flex align-items-start justify-content-center">
        {/* Upload Video Area */}
        <UploadVideoArea
          onDrop={onVideoDrop}
          uploadedVideo={uploadedVideo}
          isDragActive={false} // You can manage drag state if needed
        />

        {/* Arrow or Divider */}
        <div className="arrow">→</div>

        {/* Processed Video Area */}
        <ProcessedVideoArea
          isProcessing={isProcessing}
          processedVideo={processedVideo}
          processedVideoRef={processedVideoRef}
          videoContainerRef={videoContainerRef}
          // Pass other props and handlers as needed
        />
      </div>

      {/* Additional Panels or Components can be added here */}

      {/* Preview Gallery (Optional) */}
      {/* You can create a PreviewVideoGallery similar to PreviewImageGallery */}
    </div>
  );
}

export default MainVideo;
