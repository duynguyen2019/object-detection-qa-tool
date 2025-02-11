// src/components/TopBarImage.jsx
import React from 'react';

function TopBarImage() {
  return (
    <div className="top-bar">
      <label htmlFor="model-select">Choose a Detection Model:</label>
      <select id="model-select" className="model-select">
        <option value="modelA">Seastar</option>
        {/* Add more models as needed */}
      </select>
    </div>
  );
}

export default TopBarImage;
