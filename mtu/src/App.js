
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import CustomAIService from './Backend/custom';

const NotebookComponent = ({
  title,
  entries,
  notebookRef,
  showInput = false,
  alternateColors = false,
  currentInput,
  setCurrentInput,
  handleKeyDown,
  handleSubmit,
  inputRef,
  isLoading = false
}) => (
  <div className="notebook-container">
    <h1 className="notebook-title">{title}</h1>

    <div ref={notebookRef} className="notebook">
      {/* Notebook Header */}
      <div className="notebook-header">
        <div className="notebook-header-text">{title}</div>
      </div>

      {/* Input Section - Only for left notebook */}
      {showInput && (
        <div className="input-section">
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "AI is thinking..." : "Write your thoughts here... (Press Enter to add entry)"}
              className="text-input"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!currentInput.trim() || isLoading}
              className="add-button"
            >
              {isLoading ? "..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Entries Container */}
      <div className="entries-container">
        {entries.length === 0 && !isLoading && (
          <div className="empty-message">
            {showInput
              ? "Start writing your first entry above..."
              : "Waiting for responses..."}
          </div>
        )}

        {entries.map((entry, index) => (
          <div key={entry.id} className="entry fade-in">
            <div className="entry-timestamp">
              {entry.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div
              className={`entry-content ${
                alternateColors
                  ? entry.colorIndex % 2 === 0 ? 'yellow-entry' : 'blue-entry'
                  : entry.colorIndex !== undefined
                    ? entry.colorIndex % 2 === 0 ? 'yellow-entry' : 'blue-entry'
                    : 'default-entry'
              }`}
            >
              {entry.text.split('\n').map((line, lineIndex) => (
                <div key={lineIndex} className={lineIndex > 0 ? 'line-spacing' : ''}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Loading indicator for AI responses */}
        {isLoading && !showInput && (
          <div className="entry fade-in loading-entry">
            <div className="entry-timestamp">
              {new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="entry-content loading-content">
              <div className="ai-thinking">
                <span>🤔</span>
                <span>AI Buddy is thinking...</span>
                <div className="thinking-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Notebook Stats */}
    <div className="notebook-stats">
      {entries.length} {entries.length === 1 ? 'entry' : 'entries'} written
    </div>
  </div>
);

const App = () => {
  const [leftEntries, setLeftEntries] = useState([]);
  const [rightEntries, setRightEntries] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const leftNotebookRef = useRef(null);
  const rightNotebookRef = useRef(null);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (currentInput.trim() && !isLoading) {
      const userMessage = currentInput.trim();
      const newLeftEntry = {
        id: Date.now(),
        text: userMessage,
        timestamp: new Date(),
        colorIndex: leftEntries.length
      };
      setLeftEntries(prev => [...prev, newLeftEntry]);
      setCurrentInput('');
      setIsLoading(true);

      try {
        // Use the AI chat function to get a response
        const aiResult = await CustomAIService.chatWithChild(conversationHistory, userMessage);
        
        // Update conversation history
        setConversationHistory(aiResult.updatedHistory);
        
        // Add AI response to right notebook
        const newRightEntry = {
          id: Date.now() + 1,
          text: aiResult.response,
          timestamp: new Date(),
          colorIndex: newLeftEntry.colorIndex
        };
        setRightEntries(prev => [...prev, newRightEntry]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        // Fallback response in case of error
        const errorEntry = {
          id: Date.now() + 1,
          text: "Sorry, I'm having trouble thinking right now. Can you try asking me something else?",
          timestamp: new Date(),
          colorIndex: newLeftEntry.colorIndex
        };
        setRightEntries(prev => [...prev, errorEntry]);
      } finally {
        setIsLoading(false);
        // Ensure input stays focused after submitting
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (leftNotebookRef.current) {
      leftNotebookRef.current.scrollTop = leftNotebookRef.current.scrollHeight;
    }
  }, [leftEntries]);

  useEffect(() => {
    if (rightNotebookRef.current) {
      rightNotebookRef.current.scrollTop = rightNotebookRef.current.scrollHeight;
    }
  }, [rightEntries]);

  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="app">
      <div className="notebooks-container">
        <NotebookComponent
          title="My Journal"
          entries={leftEntries}
          notebookRef={leftNotebookRef}
          showInput={true}
          alternateColors={true}
          currentInput={currentInput}
          setCurrentInput={setCurrentInput}
          handleKeyDown={handleKeyDown}
          handleSubmit={handleSubmit}
          inputRef={inputRef}
          isLoading={isLoading}
        />

        <NotebookComponent
          title="AI Buddy"
          entries={rightEntries}
          notebookRef={rightNotebookRef}
          showInput={false}
          alternateColors={false}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default App;
