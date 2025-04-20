// src/components/UploadImageArea.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';

function UploadImageArea({ onDrop, uploadedImage, isDragActive }) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'image/*': []
    }
  });

  return (
    <div
      className={`window left-window ${isDragActive ? 'drag-active' : ''}`}
      {...getRootProps()}
    >
      <input {...getInputProps()} accept="image/*" />
      {uploadedImage ? (
        <img src={uploadedImage} alt="Uploaded" className="uploaded-image" />
      ) : (
        <p>Drag and drop images here</p>
      )}
    </div>
  );
}

UploadImageArea.propTypes = {
  onDrop: PropTypes.func.isRequired,
  uploadedImage: PropTypes.string,
  isDragActive: PropTypes.bool.isRequired,
};

export default UploadImageArea;
