import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import AIService from './Backend/AI';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(null);
  const messagesEndRef = useRef(null);

  // Check API connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!AIService.isApiKeyConfigured()) {
        setIsApiConnected(false);
        return;
      }
      
      try {
        const connected = await AIService.testConnection();
        setIsApiConnected(connected);
        if (connected) {
          setMessages([{
            id: 1,
            text: "Hello! I'm your AI assistant powered by Google Gemini. How can I help you today?",
            sender: 'ai',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        setIsApiConnected(false);
      }
    };

    checkConnection();
  }, []);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Convert messages to Gemini format for context
      const chatHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Add current user message
      chatHistory.push({
        role: 'user',
        parts: [{ text: inputValue }]
      });

      const response = await AIService.chatWithContext(chatHistory);

      const aiMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I encountered an error. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      text: "Chat cleared! How can I help you?",
      sender: 'ai',
      timestamp: new Date()
    }]);
  };

  if (isApiConnected === false) {
    return (
      <div className="App">
        <div className="error-container">
          <h2>🚫 API Configuration Error</h2>
          <p>Please check your Gemini API key configuration in the .env file.</p>
          <p>Make sure REACT_APP_GEMINI_API_KEY is set correctly.</p>
        </div>
      </div>
    );
  }

  if (isApiConnected === null) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Connecting to AI service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="chat-container">
        <header className="chat-header">
          <h1>🤖 AI Chat Assistant</h1>
          <button onClick={clearChat} className="clear-btn">
            Clear Chat
          </button>
        </header>

        <div className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message ai loading">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here... (Press Enter to send)"
            disabled={isLoading}
            rows="3"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="send-btn"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
