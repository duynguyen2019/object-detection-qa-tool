import React, { useState } from 'react';
import PropTypes from 'prop-types';

function VerificationImagePanel({
  isEditMode,
  handleEditDetections,
  selectedDetection,
  detections,
  handleAgreement,
  calculateTotalCount,
  processedResults
}) {
  const [showModal, setShowModal] = useState(false);

  const handleCoolClick = () => {
    setShowModal(false);
    window.location.reload(); // Refresh the app
  };

  return (
    <div className="verification-panel">
      <h3>Verification Panel</h3>

      {/* Verification UI */}
      {!isEditMode && selectedDetection != null && selectedDetection < detections.length && (
        <div className="verification-question">
          <p>
            Do you agree with detection #{selectedDetection + 1} labeled "
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

      {/* Placeholder when nothing is selected */}
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

      {/* New Button for Modal */}
      <button className="show-modal-btn" onClick={() => setShowModal(true)}>
        Finish Session/Upload data to Training Set
      </button>

      {/* Detection Stats */}
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Important Message</h2>
            <p>Data has been uploaded to the database and training job will be run. Please check back next week. App will be refreshed</p>
            <button className="cool-btn" onClick={handleCoolClick}>
              Cool!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

VerificationImagePanel.propTypes = {
  isEditMode: PropTypes.bool.isRequired,
  handleEditDetections: PropTypes.func.isRequired,
  selectedDetection: PropTypes.number,
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
  handleAgreement: PropTypes.func.isRequired,
  calculateTotalCount: PropTypes.func.isRequired,
  processedResults: PropTypes.arrayOf(
    PropTypes.shape({
      detection_count: PropTypes.number.isRequired,
      processed_image_url: PropTypes.string.isRequired,
      inference_result: PropTypes.string,
      detections: PropTypes.array,
    })
  ).isRequired,
};

export default VerificationImagePanel;
