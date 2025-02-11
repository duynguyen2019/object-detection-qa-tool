// src/components/UploadVideoArea.jsx
import React from 'react';
import { useDropzone } from 'react-dropzone';

function UploadVideoArea({ onDrop, uploadedVideo, isDragActive }) {
  const { getRootProps, getInputProps, isDragActive: dragActive } = useDropzone({
    onDrop,
    accept: 'video/*',
    multiple: false, // Set to true if you want to allow multiple uploads
  });

  return (
    <div {...getRootProps()} className={`upload-video-area ${dragActive || isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      {uploadedVideo ? (
        <video src={uploadedVideo} controls width="300" />
      ) : (
        <p>Drag & drop a video here, or click to select a video</p>
      )}
    </div>
  );
}

export default UploadVideoArea;
