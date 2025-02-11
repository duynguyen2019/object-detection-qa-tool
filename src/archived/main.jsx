import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

function Main() {
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
  }, []);
  
  

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,         // Allow multiple files
    accept: {
      'image/*': []         // Only images
    }
  });

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
  
          // Merge new detections
          // targetItem.detections = [...targetItem.detections, ...additionalBoxes];
  
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
      `User answered "${answer}" for detection #${selectedDetection}, label: ${
        detection.classification || 'Unlabeled'
      }`
    );
    setSelectedDetection(null);
  };

  // =============== Classification for User-Drawn Boxes ===============
  // const handleClassificationChange = (e, index) => {
  //   const newVal = e.target.value;
  //   setDetections((prev) => {
  //     const updated = [...prev];
  //     updated[index] = { ...updated[index], classification: newVal };
  //     return updated;
  //   });
  // };

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
    // e.g. “Number of seastar in this image: X”
    const oldText = targetItem.inference_result || '';
    // If you prefer to parse the old text for a digit:
    // or just rebuild from detection_count:
    targetItem.inference_result = `Number of seastar in this image: ${targetItem.detection_count}`;
  
    // 5) Reassign the updated item back into the array
    updatedResults[currentImageIndex] = targetItem;
    setProcessedResults(updatedResults);
  
    // 6) Also update the local detections state so the right window shows them
    setDetections(targetItem.detections);
  
    // 7) Clear the isUserDrawn flag from those boxes if desired
    // or leave them as isUserDrawn for reference
    // e.g.:
    // setDetections((prev) =>
    //   prev.map((box) => ({ ...box, isUserDrawn: false }))
    // );
  
    alert(`Total count updated!`);
  }


  // Placeholder chat messages for the AI Data Scientist panel
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: 'Hello! I am your AI Data Scientist. I can help you analyze these images and providing summaries/plots for the species. Please make your request! (feature under development).' },
  ]);
  const [currentMessage, setCurrentMessage] = useState('');

  // Chat message handler
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', text: currentMessage },
        { role: 'bot', text: 'This is a placeholder response. This app will be connected to a language model to generate sumamaries and plots!' },
      ]);
      setCurrentMessage('');
    }
  };

  const handlePreviewClick = (index) => {
    setCurrentImageIndex(index);
    const item = processedResults[index];
    setProcessedImage(item.processed_image_url);
    setUploadedImage(item.processed_image_url.replace('processed', 'uploads')); // Update uploadedImage
    setDetections(item.detections || []);
    setInferenceOutput(item.inference_result || '');
  };
  

  function calculateTotalCount() {
    return processedResults.reduce((sum, item) => sum + (item.detection_count || 0), 0);
  }

  // =============== Render ===============
  return (
    <div className="main-wrapper">
      {/* Top Bar */}
      <div className="top-bar">
        <label htmlFor="model-select">Choose a Detection Model:</label>
        <select id="model-select" className="model-select">
          <option value="modelA">Seastar</option>
        </select>
      </div>
  
      {/* Main Container */}
      <div className="main-container d-flex align-items-start justify-content-center">
        {/* Left Window (dropzone & uploaded image) */}
        <div
          className={`window left-window ${isDragActive ? 'drag-active' : ''}`}
          {...getRootProps()}
        >
          <input {...getInputProps()} accept="image/*" />
          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded" className="uploaded-image" />
          ) : (
            <p>Drag and drop an image here, or click to upload.</p>
          )}
        </div>
  
        {/* Arrow */}
        <div className="arrow">→</div>
  
        {/* Right Window: processed image + user-drawn bounding boxes */}
        <div className="window right-window">
          {isProcessing ? (
            <div className="spinner">Processing...</div>
          ) : processedImage ? (
            <div
              className="processed-area"
              ref={containerRef}
              style={{ position: 'relative' }}
              onMouseDown={isEditMode ? handleMouseDown : undefined}
              onMouseMove={isEditMode ? handleMouseMove : undefined}
              onMouseUp={isEditMode ? handleMouseUp : undefined}
            >
              <div className="image-container" style={{ position: 'relative' }}>
                <img
                  ref={processedImgRef}
                  onLoad={handleImageLoad}
                  src={processedImage}
                  alt="Processed"
                  className="processed-image"
                  style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                />
  
                {/* Show the final user-drawn boxes (in addition to in-progress) */}
                {detections.map((box, idx) => (
                  <div
                    key={idx}
                    className={`bounding-box ${box.isUserDrawn ? 'user-box' : 'backend-box'}`}
                    style={{
                      top: box.y,
                      left: box.x,
                      width: box.width,
                      height: box.height,
                    }}
                    onClick={() => handleBoxClick(idx)}
                  />
                ))}
  
                {/* The in-progress box (while dragging) */}
                {currentBox && (
                  <div
                    className="bounding-box temp-box"
                    style={{
                      position: 'absolute',
                      top: currentBox.y,
                      left: currentBox.x,
                      width: currentBox.width,
                      height: currentBox.height,
                      border: '2px dashed blue',
                      zIndex: 999,
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <p>No output yet</p>
          )}
        </div>
  
        {/* Verification Panel (outside right window) */}
        <div className="verification-panel">
          <h3>Verification Panel</h3>
  
          {/* If NOT in edit mode, show detection agreement UI for selected box */}
          {!isEditMode && selectedDetection != null && selectedDetection < detections.length && (
            <div className="verification-question">
              <p>
                Do you agree with detection #{selectedDetection} labeled "
                {detections[selectedDetection].classification || 'Unlabeled'}"?
              </p>
              <button className="agree-btn" onClick={() => handleAgreement('yes')}>
                Yes
              </button>
              <button className="disagree-btn" onClick={() => handleAgreement('no')}>
                No
              </button>
            </div>
          )}
  
          {/* If not editing and nothing is selected */}
          {!isEditMode && selectedDetection == null && (
            <p className="placeholder">
              Click a bounding box to verify or click "Add Boxes" to add new boxes.
            </p>
          )}
  
          <hr />
  
          {/* Edit Mode Toggle */}
          <button className="edit-detections-btn" onClick={handleEditDetections}>
            {isEditMode ? 'Finish Editing' : 'Add Boxes'}
          </button>

  
          {/* While editing, classification inputs for user-drawn boxes */}
          {isEditMode && (
            <div className="classification-list">
              <h4>Additional Boxes (Drawing Mode)</h4>
              {/* Classification inputs removed */}
            </div>
          )}
  
          {/* (B) Detection Stats (new section) */}
          <div className="detection-stats" style={{ marginTop: '1rem' }}>
            <h4>Detection Stats</h4>
            {processedResults.map((item, i) => (
              <p key={i}>
                Image #{i + 1}: {item.detection_count} seastars
              </p>
            ))}

            <p>
              <strong>Total seastars:</strong> {calculateTotalCount()}
            </p>
          </div>
        </div>
  
        <div className="ai-data-scientist-panel">
          <h3>AI Data Scientist Chatbot</h3>
          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`}>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="chat-input-form">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your request here..."
                className="chat-input"
              />
              <button type="submit" className="chat-submit-btn">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="preview-gallery">
        <h3>Preview</h3>
        <div className="processed-images-container">
          <div className="processed-images-grid">
            {processedResults.length > 0 ? (
              processedResults.map((item, idx) => (
                <div
                  key={idx}
                  className="processed-image-item"
                  onClick={() => handlePreviewClick(idx)}
                  style={{ position: 'relative' }}
                >
                  {/* Image ID overlay */}
                  <div className="image-id-overlay">Image #{idx + 1}</div>
                  <img
                    src={item.processed_image_url}
                    alt={`Processed ${idx}`}
                    style={{ width: '150px', height: 'auto' }}
                  />
                </div>
              ))
            ) : (
              <p>No processed output yet...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
