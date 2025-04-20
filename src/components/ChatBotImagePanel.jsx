// src/components/ChatBotImagePanel.jsx
import React from 'react';
import PropTypes from 'prop-types';

function ChatBotImagePanel({ chatMessages, currentMessage, setCurrentMessage, handleChatSubmit }) {
  return (
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
  );
}

ChatBotImagePanel.propTypes = {
  chatMessages: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  currentMessage: PropTypes.string.isRequired,
  setCurrentMessage: PropTypes.func.isRequired,
  handleChatSubmit: PropTypes.func.isRequired,
};

export default ChatBotImagePanel;
