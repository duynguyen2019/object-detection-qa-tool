import React from 'react';

function TopBarImage() {
  const handleDownload = async () => {
    try {
      const response = await fetch('/object-detection/download-demo', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'demo_results.zip'; // Change filename if needed
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading demo:', error);
    }
  };

  return (
    <div className="top-bar">
      <label htmlFor="model-select">Choose a Detection Model:</label>
      <select id="model-select" className="model-select">
        <option value="modelA">Seastar</option>
        {/* Add more models as needed */}
      </select>
      <button onClick={handleDownload} className="download-btn">
        Download Demo
      </button>
    </div>
  );
}

export default TopBarImage;
