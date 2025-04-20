// src/components/PreviewImageGallery.jsx
import React from 'react';
import PropTypes from 'prop-types';

function PreviewImageGallery({ processedResults, handlePreviewClick }) {
  return (
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
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                {/* Image ID Overlay */}
                <div className="image-id-overlay">Image #{idx + 1}</div>
                <img
                  src={item.processed_image_url}
                  alt={`Processed ${idx + 1}`}
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
  );
}

PreviewImageGallery.propTypes = {
  processedResults: PropTypes.arrayOf(
    PropTypes.shape({
      processed_image_url: PropTypes.string.isRequired,
      detection_count: PropTypes.number.isRequired,
      inference_result: PropTypes.string,
      detections: PropTypes.array,
    })
  ).isRequired,
  handlePreviewClick: PropTypes.func.isRequired,
};

export default PreviewImageGallery;
