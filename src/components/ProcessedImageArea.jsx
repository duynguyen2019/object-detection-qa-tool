// src/components/ProcessedImageArea.jsx
import React from 'react';
import PropTypes from 'prop-types';

function ProcessedImageArea({
  isProcessing,
  processedImage,
  containerRef,
  detections,
  handleBoxClick,
  isEditMode,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  currentBox,
  processedImgRef,
  handleImageLoad,
  imageId
}) {
  return (
    <div className="window right-window">
            {/* Image ID Indicator */}
      {imageId !== null && (
        <div className="current-image-id">
          Viewing Image ID: {imageId}
        </div>
      )}

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

            {/* Existing Bounding Boxes */}
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

            {/* In-progress Box */}
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
  );
}

ProcessedImageArea.propTypes = {
  isProcessing: PropTypes.bool.isRequired,
  processedImage: PropTypes.string,
  containerRef: PropTypes.object.isRequired,
  detections: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
      isUserDrawn: PropTypes.bool,
      classification: PropTypes.string,
    })
  ).isRequired,
  handleBoxClick: PropTypes.func.isRequired,
  isEditMode: PropTypes.bool.isRequired,
  handleMouseDown: PropTypes.func.isRequired,
  handleMouseMove: PropTypes.func.isRequired,
  handleMouseUp: PropTypes.func.isRequired,
  currentBox: PropTypes.object,
  processedImgRef: PropTypes.object.isRequired,
  handleImageLoad: PropTypes.func.isRequired,
  imageId: PropTypes.number,
};

export default ProcessedImageArea;
