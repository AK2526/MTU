import React, { useState, useRef, useEffect } from 'react';
import './App.css';

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
  inputRef
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
              placeholder="Write your thoughts here... (Press Enter to add entry)"
              className="text-input"
            />
            <button
              onClick={handleSubmit}
              disabled={!currentInput.trim()}
              className="add-button"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Entries Container */}
      <div className="entries-container">
        {entries.length === 0 && (
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
  const leftNotebookRef = useRef(null);
  const rightNotebookRef = useRef(null);
  const inputRef = useRef(null);

  const handleSubmit = () => {
    if (currentInput.trim()) {
      const newLeftEntry = {
        id: Date.now(),
        text: currentInput.trim(),
        timestamp: new Date(),
        colorIndex: leftEntries.length
      };
      setLeftEntries(prev => [...prev, newLeftEntry]);

      // Backend simulation - automatically add entry to right notebook
      // This simulates a backend process that responds to user input
      // In a real app, this would be an API call or server-side logic
      setTimeout(() => {
        const responseTexts = [
          "Processing your input...",
          "That's an interesting thought!",
          "I understand what you mean.",
          "Thanks for sharing that.",
          "Let me think about this.",
          "Good point to consider.",
          "I see your perspective.",
          "That makes sense.",
          "Noted for future reference.",
          "Interesting observation."
        ];
        
        const randomResponse = responseTexts[Math.floor(Math.random() * responseTexts.length)];
        const newRightEntry = {
          id: Date.now() + 1,
          text: randomResponse,
          timestamp: new Date(),
          colorIndex: newLeftEntry.colorIndex
        };
        setRightEntries(prev => [...prev, newRightEntry]);
      }, 500);

      setCurrentInput('');
      // Ensure input stays focused after submitting
      if (inputRef.current) {
        inputRef.current.focus();
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
          title="My Notebook"
          entries={leftEntries}
          notebookRef={leftNotebookRef}
          showInput={true}
          alternateColors={true}
          currentInput={currentInput}
          setCurrentInput={setCurrentInput}
          handleKeyDown={handleKeyDown}
          handleSubmit={handleSubmit}
          inputRef={inputRef}
        />
        
        <NotebookComponent
          title="Response Log"
          entries={rightEntries}
          notebookRef={rightNotebookRef}
          showInput={false}
          alternateColors={false}
        />
      </div>
    </div>
  );
};

export default App;