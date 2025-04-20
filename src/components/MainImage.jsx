// src/components/Main.jsx
import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
  const [sessionFinished, setSessionFinished] = useState(false);
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
      const ext = file.name.split('.').pop().toLowerCase();
      if (validExtensions.includes(ext)) {
        return new File([file], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: file.type });
      } else {
        alert(`Invalid file type: ${file.name}. Please upload .jpg, .jpeg, or .png.`);
        return false;
      }
    });

    if (!filteredFiles.length) return;

    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result);
    reader.readAsDataURL(filteredFiles[0]);

    const formData = new FormData();
    filteredFiles.forEach((f) => formData.append('files', f));

    setIsProcessing(true);
    axios.post('/object-detection/detect', formData)
      .then(({ data }) => {
        if (data.results) {
          setProcessedResults(prev => [...prev, ...data.results]);
          if (currentImageIndex === null && data.results.length) {
            const first = data.results[0];
            setProcessedImage(first.processed_image_url);
            setUploadedImage(first.processed_image_url.replace('processed', 'uploads'));
            setDetections(first.detections || []);
            setInferenceOutput(first.inference_result || '');
            setCurrentImageIndex(0);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsProcessing(false));
  }, [currentImageIndex]);

  // =============== Download YOLO Training Data ===============
  const handleDownloadTrainingData = async () => {
    if (!processedResults.length) {
      alert('No processed results to download.');
      return;
    }

    const zip = new JSZip();
    const train = zip.folder('train');
    const imagesFolder = train.folder('images');
    const labelsFolder = train.folder('labels');

    await Promise.all(processedResults.map(async (item, idx) => {
      const imageUrl = item.processed_image_url.replace('processed', 'uploads');
      let blob;
      try {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } catch {
        blob = new Blob();
      }
      const ext = imageUrl.split('.').pop();
      const imageName = `image_${idx}.${ext}`;
      imagesFolder.file(imageName, blob);

      const lines = (item.detections || []).map(det => {
        const cls = det.classification ?? 0;
        const xC = (det.x + det.width / 2) / origWidth;
        const yC = (det.y + det.height / 2) / origHeight;
        const wN = det.width / origWidth;
        const hN = det.height / origHeight;
        return `${cls} ${xC.toFixed(6)} ${yC.toFixed(6)} ${wN.toFixed(6)} ${hN.toFixed(6)}`;
      });
      const labelName = imageName.replace(/\.[^/.]+$/, '.txt');
      labelsFolder.file(labelName, lines.join('\n'));
    }));

    zip.file('data.yaml', `train: train/images
val: train/images
nc: 1
names: ['seastar']`);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'yolo_training_data.zip');
  };

  // =============== Reset App ===============
  const handleResetApp = () => {
    setUploadedImages([]);
    setProcessedResults([]);
    setUploadedImage(null);
    setProcessedImage(null);
    setInferenceOutput(null);
    setDetections([]);
    setSelectedDetection(null);
    setIsProcessing(false);
    setCurrentImageIndex(null);
    setIsEditMode(false);
    setCurrentBox(null);
    setSessionFinished(false);
  };

  // =============== Finish Session ===============
  const handleFinishSession = () => {
    setSessionFinished(true);
  };

  // =============== Editing / Drawing Logic ===============
  const handleEditDetections = () => {
    if (isEditMode) {
      const newBoxes = detections.filter(b => b.isUserDrawn);
      if (newBoxes.length && currentImageIndex != null) {
        setProcessedResults(prev => {
          const updated = [...prev];
          const item = { ...updated[currentImageIndex] };
          item.detections = [...(item.detections || []), ...newBoxes];
          item.detection_count = (item.detection_count || 0) + newBoxes.length;
          item.inference_result = `Number of seastar in this image: ${item.detection_count}`;
          updated[currentImageIndex] = item;
          return updated;
        });
        setDetections(prev => prev.map(b => ({ ...b, isUserDrawn: false })));
        alert(`Saved ${newBoxes.length} new box(es).`);
      }
    }
    setIsEditMode(!isEditMode);
    setSelectedDetection(null);
    setCurrentBox(null);
  };

  const handleMouseDown = e => {
    if (!isEditMode) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - left;
    const startY = e.clientY - top;
    setCurrentBox({ startX, startY, x: startX, y: startY, width: 0, height: 0, isUserDrawn: true, classification: '' });
  };

  const handleMouseMove = e => {
    if (!isEditMode || !currentBox) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - left;
    const cy = e.clientY - top;
    setCurrentBox(prev => ({
      ...prev,
      x: Math.min(prev.startX, cx),
      y: Math.min(prev.startY, cy),
      width: Math.abs(cx - prev.startX),
      height: Math.abs(cy - prev.startY),
    }));
  };

  const handleMouseUp = () => {
    if (!isEditMode || !currentBox) return;
    if (currentBox.width < 5 || currentBox.height < 5) {
      setCurrentBox(null);
      return;
    }
    setDetections(prev => [...prev, { ...currentBox }]);
    setCurrentBox(null);
  };

  const handleBoxClick = idx => {
    if (!isEditMode) setSelectedDetection(idx);
  };
  const handleAgreement = ans => {
    if (selectedDetection != null) {
      console.log(`Agreement for #${selectedDetection+1}: ${ans}`);
      setSelectedDetection(null);
    }
  };

  const handlePreviewClick = idx => {
    setCurrentImageIndex(idx);
    const item = processedResults[idx];
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
        <UploadImageArea onDrop={onDrop} uploadedImage={uploadedImage} isDragActive={false} />

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
          imageId={currentImageIndex != null ? currentImageIndex + 1 : null}
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
      <div className="main-controls text-center mb-4">
        {!sessionFinished && (
          <button className="btn btn-warning" onClick={handleFinishSession}>
            Finish Session
          </button>
        )}
        {sessionFinished && (
          <>
            <button className="btn btn-success mr-2" onClick={handleDownloadTrainingData}>
              Download YOLO Training Data
            </button>
            <button className="btn btn-secondary" onClick={handleResetApp}>
              Reset App
            </button>
          </>
        )}
      </div>
      <PreviewImageGallery
        processedResults={processedResults}
        handlePreviewClick={handlePreviewClick}
      />
    </div>
  );
}

export default MainImage;
