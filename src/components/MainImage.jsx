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

function MainImage() {
  // =============== State Management ===============
  const [uploadedImages, setUploadedImages] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [inferenceOutput, setInferenceOutput] = useState(null);
  const [detections, setDetections] = useState([]);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBox, setCurrentBox] = useState(null);
  const containerRef = useRef(null);
  const processedImgRef = useRef(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [origWidth] = useState(1920);
  const [origHeight] = useState(1080);

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
    const validExtensions = ['jpg', 'jpeg', 'png'];
    const filteredFiles = acceptedFiles.filter((file) => {
      const extension = file.name.split('.').pop().toLowerCase();
      if (validExtensions.includes(extension)) {
        const normalizedFile = new File(
          [file],
          file.name.replace(/\.[^.]+$/, `.${extension}`),
          { type: file.type }
        );
        return normalizedFile;
      } else {
        alert(`Invalid file type: ${file.name}. Please upload .jpg, .jpeg, or .png files.`);
        return false;
      }
    });

    if (filteredFiles.length > 0) {
      const reader = new FileReader();
      reader.onload = () => setUploadedImage(reader.result);
      reader.readAsDataURL(filteredFiles[0]);

      const formData = new FormData();
      filteredFiles.forEach((file) => formData.append('files', file));

      setIsProcessing(true);
      axios
        .post('/object-detection/detect', formData)
        .then((response) => {
          if (response.data && response.data.results) {
            const newResults = response.data.results;
            setProcessedResults((prev) => [...prev, ...newResults]);
            if (newResults.length > 0 && currentImageIndex === null) {
              const first = newResults[0];
              setProcessedImage(first.processed_image_url);
              setUploadedImage(first.processed_image_url.replace('processed', 'uploads'));
              setDetections(first.detections || []);
              setInferenceOutput(first.inference_result || '');
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
      // finishing editing → merge user‐drawn boxes into processedResults
      const additionalBoxes = detections.filter((box) => box.isUserDrawn);
      const numNew = additionalBoxes.length;
      if (numNew > 0 && currentImageIndex != null) {
        setProcessedResults((prev) => {
          const updated = [...prev];
          const item = { ...updated[currentImageIndex] };

          // 1) append new boxes
          item.detections = [...(item.detections || []), ...additionalBoxes];
          // 2) bump count & inference text
          item.detection_count = (item.detection_count || 0) + numNew;
          item.inference_result = `Number of seastar in this image: ${item.detection_count}`;

          updated[currentImageIndex] = item;
          return updated;
        });

        // reflect the saved boxes in local state
        setDetections((prev) => [...prev, ...additionalBoxes]);
        setInferenceOutput(
          `Number of seastar in this image: ${
            (processedResults[currentImageIndex]?.detection_count || 0) + numNew
          }`
        );

        alert(`Saved ${numNew} new box(es) for image #${currentImageIndex + 1}.`);
      }
      // clear the “isUserDrawn” flags
      setDetections((all) => all.map((b) => ({ ...b, isUserDrawn: false })));
    }

    // Toggle edit mode & reset selection/box
    setIsEditMode((prev) => !prev);
    setSelectedDetection(null);
    setCurrentBox(null);
  };

  const handleMouseDown = (e) => {
    if (!isEditMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
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
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
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
    const minSize = 5;
    if (currentBox.width < minSize || currentBox.height < minSize) {
      setCurrentBox(null);
      return;
    }
    setDetections((prev) => [...prev, { ...currentBox }]);
    setCurrentBox(null);
  };

  // =============== Box Interactions (Click, Yes/No) ===============
  const handleBoxClick = (index) => {
    if (isEditMode) return;
    setSelectedDetection(index);
  };

  const handleAgreement = (answer) => {
    if (selectedDetection == null) return;
    console.log(
      `User answered "${answer}" for detection #${selectedDetection + 1}`
    );
    setSelectedDetection(null);
  };

  // =============== Preview Gallery Handler ===============
  const handlePreviewClick = (index) => {
    setCurrentImageIndex(index);
    const item = processedResults[index];
    setProcessedImage(item.processed_image_url);
    setUploadedImage(item.processed_image_url.replace('processed', 'uploads'));
    setDetections(item.detections || []);
    setInferenceOutput(item.inference_result || '');
  };

  // =============== Render ===============
  return (
    <div className="main-wrapper">
      <TopBarImage />

      <div className="main-container d-flex align-items-start justify-content-center">
        <UploadImageArea
          onDrop={onDrop}
          uploadedImage={uploadedImage}
          isDragActive={false}
        />

        <div className="arrow">→</div>

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
          imageId={currentImageIndex !== null ? currentImageIndex + 1 : null}
        />

        <VerificationImagePanel
          isEditMode={isEditMode}
          handleEditDetections={handleEditDetections}
          selectedDetection={selectedDetection}
          detections={detections}
          handleAgreement={handleAgreement}
          calculateTotalCount={() =>
            processedResults.reduce((sum, i) => sum + (i.detection_count || 0), 0)
          }
          processedResults={processedResults}
        />
      </div>

      <PreviewImageGallery
        processedResults={processedResults}
        handlePreviewClick={handlePreviewClick}
      />
    </div>
  );
}

export default MainImage;
