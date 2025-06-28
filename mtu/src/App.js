import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import CustomAIService from './Backend/custom';

// Cache for storing Gemini-generated synonyms
const SYNONYMS_CACHE = new Map();

// Function to get synonyms from Gemini API
const getSynonymsFromGemini = async (word) => {
  // Check cache first
  if (SYNONYMS_CACHE.has(word.toLowerCase())) {
    return SYNONYMS_CACHE.get(word.toLowerCase());
  }

  try {
    const response = await CustomAIService.getVocabularySuggestions(word, ""); // Empty context for standalone word lookup
    
    // // Parse the response to extract synonyms
    // const synonymsText = response.response.trim();
    // const synonyms = synonymsText.split(',').map(s => s.trim()).slice(0, 3);
    
    // // Cache the result
    // SYNONYMS_CACHE.set(word.toLowerCase(), synonyms);
    
    return response; // Return the full response for now, can be adjusted later if needed
  } catch (error) {
    console.error('Error getting synonyms from Gemini:', error);
    // Return empty array if API fails
    return [];
  }
};

// Component to render text with synonym tooltips (only for user entries)
const SynonymText = ({ text, colorClass, enableSynonyms = false }) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [synonyms, setSynonyms] = useState([]);
  const [loadingSynonyms, setLoadingSynonyms] = useState(false);

  const handleWordHover = async (e, word) => {
    if (!enableSynonyms) return;
    
    setLoadingSynonyms(true);
    setHoveredWord(word.toLowerCase());
    
    const rect = e.target.getBoundingClientRect();
    const parentRect = e.target.closest('.entry-content').getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2 - parentRect.left,
      y: rect.top - parentRect.top - 5
    });

    const wordSynonyms = await getSynonymsFromGemini(word);
    setSynonyms(wordSynonyms);
    setLoadingSynonyms(false);
  };

  const handleWordLeave = () => {
    setHoveredWord(null);
    setSynonyms([]);
    setLoadingSynonyms(false);
  };

  const isWordEligibleForSynonyms = (word) => {
    if (!enableSynonyms) return false;
    
    const cleanWord = word.replace(/[.,!?;:"()]/g, '').toLowerCase();
    // Only process words that are at least 3 characters and are likely content words
    return cleanWord.length >= 3 && 
           !/^(the|and|or|but|in|on|at|to|for|of|with|by|from|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|this|that|these|those|i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|her|its|our|their)$/.test(cleanWord);
  };

  const renderTextWithSynonyms = (text) => {
    // Split text into sentences
    const sentences = text.split(/([.!?]+)/);
    
    return sentences.map((sentence, sentenceIndex) => {
      if (!sentence.trim() || /^[.!?]+$/.test(sentence)) {
        return <span key={sentenceIndex}>{sentence}</span>;
      }
      
      const words = sentence.split(/(\s+)/);
      let synonymWordFound = false;
      
      // First pass: check eligible words
      const eligibleWords = words.map((word, index) => {
        const cleanWord = word.replace(/[.,!?;:"()]/g, '').toLowerCase();
        return isWordEligibleForSynonyms(word) ? { word: cleanWord, index } : null;
      }).filter(Boolean);
      
      // Pick one random eligible word per sentence
      const selectedWord = eligibleWords.length > 0 
        ? eligibleWords[Math.floor(Math.random() * eligibleWords.length)]
        : null;
      
      return (
        <span key={sentenceIndex}>
          {words.map((word, index) => {
            const cleanWord = word.replace(/[.,!?;:"()]/g, '').toLowerCase();
            
            if (selectedWord && index === selectedWord.index && word.trim() && !synonymWordFound) {
              synonymWordFound = true;
              return (
                <span key={index} className="synonym-wrapper">
                  <span
                    className="synonym-word"
                    onMouseEnter={(e) => handleWordHover(e, cleanWord)}
                    onMouseLeave={handleWordLeave}
                  >
                    {word}
                  </span>
                </span>
              );
            }
            
            return <span key={index}>{word}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div className={`entry-content ${colorClass}`}>
      {text.split('\n').map((line, lineIndex) => (
        <div key={lineIndex} className={lineIndex > 0 ? 'line-spacing' : ''}>
          {renderTextWithSynonyms(line)}
        </div>
      ))}
      
      {/* Synonym tooltip */}
      {hoveredWord && enableSynonyms && (
        <div 
          className="synonym-tooltip"
          style={{
            position: 'absolute',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%)',
            zIndex: 1000
          }}
        >
          <div className="synonym-tooltip-content">
            {loadingSynonyms ? (
              <div className="synonym-loading">Loading...</div>
            ) : (
              <>
                <div className="synonym-tooltip-title">Try: </div>
                <div className="synonym-list">
                  {synonyms.length > 0 ? (
                    synonyms.map((synonym, index) => (
                      <span key={index} className="synonym-item">
                        {synonym}
                        {index < synonyms.length - 1 ? ' • ' : ''}
                      </span>
                    ))
                  ) : (
                    <span className="synonym-item">No suggestions</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
            <SynonymText 
              text={entry.text}
              enableSynonyms={showInput} // Only enable synonyms for the input notebook (left side)
              colorClass={
                alternateColors
                  ? entry.colorIndex % 2 === 0 ? 'yellow-entry' : 'blue-entry'
                  : entry.colorIndex !== undefined
                    ? entry.colorIndex % 2 === 0 ? 'yellow-entry' : 'blue-entry'
                    : 'default-entry'
              }
            />
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