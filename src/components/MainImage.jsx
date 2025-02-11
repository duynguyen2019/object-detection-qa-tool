// src/components/Main.jsx
import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';

// Import the newly created components
import UploadImageArea from './UploadImageArea';
import ProcessedImageArea from './ProcessedImageArea';
import VerificationImagePanel from './VerificationImagePanel';
import ChatBotImagePanel from './ChatBotImagePanel';
import PreviewImageGallery from './PreviewImageGallery';
import TopBarImage from './TopBarImage';
// import DetectionImageStats from './DetectionImageStats'; // If using

function MainImage() {
  // =============== State Management ===============
  const [uploadedImages, setUploadedImages] = useState([]); 
  const [processedResults, setProcessedResults] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);        // The raw image displayed in left window
  const [processedImage, setProcessedImage] = useState(null);      // The YOLO-processed image (right window)
  const [inferenceOutput, setInferenceOutput] = useState(null);    // Display text (e.g., "Number of seastar...")
  const [detections, setDetections] = useState([]);                // We'll store user-drawn boxes here
  const [selectedDetection, setSelectedDetection] = useState(null); // Which box is selected (for verification)
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(null);

  // Toggle edit mode: can draw boxes if true
  const [isEditMode, setIsEditMode] = useState(false);

  // For the user’s in-progress box while drawing
  const [currentBox, setCurrentBox] = useState(null);

  // References for measuring displayed image size
  const containerRef = useRef(null);
  const processedImgRef = useRef(null);

  // Store the displayed image size after it loads
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  // Suppose your backend or metadata says the image is originally 1920×1080 in pixels
  // (We won't do server boxes right now.)
  const [origWidth, setOrigWidth] = useState(1920);
  const [origHeight, setOrigHeight] = useState(1080);

  // =============== Image Load Handler ===============
  const handleImageLoad = () => {
    if (processedImgRef.current) {
      setImgSize({
        width: processedImgRef.current.clientWidth,
        height: processedImgRef.current.clientHeight,
      });
    }
  };

  // =============== Dropzone and Upload to Server ===============
  const onDrop = useCallback((acceptedFiles) => {
    // Filter files based on their extension
    const validExtensions = ['jpg', 'jpeg', 'png'];
  
    const filteredFiles = acceptedFiles.filter((file) => {
      // Extract the file extension and convert to lowercase
      const extension = file.name.split('.').pop().toLowerCase();
  
      if (validExtensions.includes(extension)) {
        // Normalize the file name to lowercase extension
        const normalizedFile = new File(
          [file],
          file.name.replace(/\.[^.]+$/, `.${extension}`), // Replace extension with lowercase
          { type: file.type }
        );
  
        return normalizedFile;
      } else {
        alert(`Invalid file type: ${file.name}. Please upload .jpg, .jpeg, or .png files.`);
        return false;
      }
    });
  
    if (filteredFiles.length > 0) {
      // Display the first valid image in the left window
      const reader = new FileReader();
      reader.onload = () => setUploadedImage(reader.result);
      reader.readAsDataURL(filteredFiles[0]);
  
      // Prepare files for backend upload
      const formData = new FormData();
      filteredFiles.forEach((file) => formData.append('files', file));
  
      // Send files to the server
      setIsProcessing(true);
      axios
        .post('/object-detection/detect', formData)
        .then((response) => {
          if (response.data && response.data.results) {
            const newResults = response.data.results;
            setProcessedResults((prev) => [...prev, ...newResults]);
  
            // Default to the first processed image if none selected
            if (newResults.length > 0 && currentImageIndex === null) {
              const processedImageUrl = newResults[0].processed_image_url;
              setProcessedImage(processedImageUrl);
              setUploadedImage(processedImageUrl.replace('processed', 'uploads'));
              setDetections(newResults[0].detections || []);
              setInferenceOutput(newResults[0].inference_result || '');
              setCurrentImageIndex(0);
            }
          }
          setIsProcessing(false);
        })
        .catch((error) => {
          console.error('Processing error:', error);
          setIsProcessing(false);
        });
    }
  }, [currentImageIndex]);

  // =============== Editing / Drawing Logic ===============
  const handleEditDetections = () => {
    if (isEditMode) {
      // User is finishing editing; submit the additional boxes
      const additionalBoxes = detections.filter((box) => box.isUserDrawn);
      const newCount = additionalBoxes.length;
  
      if (newCount > 0) {
        // Update the processedResults with the new boxes
        setProcessedResults((prevResults) => {
          if (currentImageIndex === null || currentImageIndex >= prevResults.length) {
            console.error('Invalid currentImageIndex:', currentImageIndex);
            return prevResults;
          }
  
          const updatedResults = [...prevResults];
          const targetItem = { ...updatedResults[currentImageIndex] };
  
          // Update detection_count
          targetItem.detection_count += newCount;
  
          // Update inference_result
          targetItem.inference_result = `Number of seastar in this image: ${targetItem.detection_count}`;
  
          // Update the array
          updatedResults[currentImageIndex] = targetItem;
  
          console.log(`Updated image #${currentImageIndex + 1}:`, targetItem); // Debugging line
  
          return updatedResults;
        });
  
        // Synchronize detections with the updated processedResults
        setDetections((prev) => {
          const updatedDetections = [...prev, ...additionalBoxes];
          return updatedDetections;
        });
  
        // Update inference output
        setInferenceOutput(() => {
          if (currentImageIndex !== null && processedResults[currentImageIndex]) {
            return `Number of seastar in this image: ${processedResults[currentImageIndex].detection_count}`;
          }
          return inferenceOutput;
        });
  
        alert(`Submitted ${newCount} new box(es).`);
      }
  
      // Reset isUserDrawn flags regardless of whether new boxes were added
      setDetections((prev) =>
        prev.map((box) => ({
          ...box,
          isUserDrawn: false,
        }))
      );
    }
  
    // Toggle edit mode
    setIsEditMode((prev) => !prev);
    setSelectedDetection(null);
    setCurrentBox(null);
  };

  const handleMouseDown = (e) => {
    if (!isEditMode || !containerRef.current) return;
  
    // Get container's bounding box
    const rect = containerRef.current.getBoundingClientRect();
  
    // Calculate mouse position relative to the container
    const startX = e.clientX - rect.left; 
    const startY = e.clientY - rect.top;
  
    // Initialize the current box state
    setCurrentBox({
      startX,
      startY,
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      isUserDrawn: true,
      classification: '',
    });
  };

  const handleMouseMove = (e) => {
    if (!isEditMode || !currentBox || !containerRef.current) return;
  
    // Get container's bounding box
    const rect = containerRef.current.getBoundingClientRect();
  
    // Calculate the current mouse position relative to the container
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
  
    // Update the box dimensions
    setCurrentBox((prev) => ({
      ...prev,
      x: Math.min(prev.startX, currentX),
      y: Math.min(prev.startY, currentY),
      width: Math.abs(currentX - prev.startX),
      height: Math.abs(currentY - prev.startY),
    }));
  };

  const handleMouseUp = () => {
    if (!isEditMode || !currentBox) return;
  
    // Minimum size for the box to be valid
    const minSize = 5;
  
    // Discard the box if it's too small
    if (currentBox.width < minSize || currentBox.height < minSize) {
      setCurrentBox(null);
      return;
    }
  
    // Add the finalized box to the detections list
    setDetections((prev) => [...prev, { ...currentBox }]);
    setCurrentBox(null); // Reset the current box
  };

  // =============== Box Interactions (Click, Yes/No) ===============
  const handleBoxClick = (index) => {
    if (isEditMode) return; // only clickable outside edit mode
    setSelectedDetection(index);
  };

  const handleAgreement = (answer) => {
    if (selectedDetection == null) return;
    const detection = detections[selectedDetection];
    console.log(
      `User answered "${answer}" for detection #${selectedDetection + 1}, label: ${
        detection.classification || 'Unlabeled'
      }`
    );
    setSelectedDetection(null);
  };

  // =============== Submit User-Drawn Boxes ===============
  function handleSubmitAdditionalBoxes() {
    if (currentImageIndex === null) return; // nothing selected
    
    // 1) Identify which boxes are new
    const additionalBoxes = detections.filter((d) => d.isUserDrawn);
    const newCount = additionalBoxes.length;
  
    if (newCount === 0) {
      alert('No new boxes to submit.');
      return;
    }
  
    // 2) Merge new boxes into the processedResults array
    const updatedResults = [...processedResults];
    const targetItem = { ...updatedResults[currentImageIndex] };
  
    // Combine old boxes + new boxes
    targetItem.detections = [...targetItem.detections, ...additionalBoxes];
  
    // 3) Update the detection_count
    targetItem.detection_count += newCount;
  
    // 4) Optionally update the item’s inference_result text
    targetItem.inference_result = `Number of seastar in this image: ${targetItem.detection_count}`;
  
    // 5) Reassign the updated item back into the array
    updatedResults[currentImageIndex] = targetItem;
    setProcessedResults(updatedResults);
  
    // 6) Also update the local detections state so the right window shows them
    setDetections(targetItem.detections);
  
    alert(`Total count updated!`);
  }

  // =============== Chat Bot State and Handlers ===============
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: 'Hello! I am your AI Data Scientist. I can help you analyze these images and provide summaries/plots for the species. Please make your request! (feature under development).' },
  ]);
  const [currentMessage, setCurrentMessage] = useState('');

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', text: currentMessage },
        { role: 'bot', text: 'This is a placeholder response. This app will be connected to a language model to generate summaries and plots!' },
      ]);
      setCurrentMessage('');
    }
  };

  // =============== Preview Gallery Handler ===============
  const handlePreviewClick = (index) => {
    setCurrentImageIndex(index);
    const item = processedResults[index];
    setProcessedImage(item.processed_image_url);
    setUploadedImage(item.processed_image_url.replace('processed', 'uploads')); // Update uploadedImage
    setDetections(item.detections || []);
    setInferenceOutput(item.inference_result || '');
  };

  // =============== Calculate Total Count ===============
  function calculateTotalCount() {
    return processedResults.reduce((sum, item) => sum + (item.detection_count || 0), 0);
  }

  const imageId = currentImageIndex !== null ? currentImageIndex + 1 : null;

  // =============== Render ===============
  return (
    <div className="main-wrapper">
      {/* Top Bar */}
      <TopBarImage />

      {/* Main Container */}
      <div className="main-container d-flex align-items-start justify-content-center">
        {/* Left Window (dropzone & uploaded image) */}
        <UploadImageArea
          onDrop={onDrop}
          uploadedImage={uploadedImage}
          isDragActive={false} // You can manage drag state if needed
        />

        {/* Arrow */}
        <div className="arrow">→</div>

        {/* Right Window: processed image + user-drawn bounding boxes */}
        <ProcessedImageArea
          isProcessing={isProcessing}
          processedImage={processedImage}
          containerRef={containerRef}
          detections={detections}
          handleBoxClick={handleBoxClick}
          isEditMode={isEditMode}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          currentBox={currentBox}
          processedImgRef={processedImgRef}
          handleImageLoad={handleImageLoad}
          imageId={imageId}
        />

        {/* Verification Panel */}
        <VerificationImagePanel
          isEditMode={isEditMode}
          handleEditDetections={handleEditDetections}
          selectedDetection={selectedDetection}
          detections={detections}
          handleAgreement={handleAgreement}
          calculateTotalCount={calculateTotalCount}
          processedResults={processedResults}
        />

        {/* Chat Bot Panel */}
        <ChatBotImagePanel
          chatMessages={chatMessages}
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          handleChatSubmit={handleChatSubmit}
        />
      </div>

      {/* Preview Gallery */}
      <PreviewImageGallery
        processedResults={processedResults}
        handlePreviewClick={handlePreviewClick}
      />
    </div>
  );
}

export default MainImage;
