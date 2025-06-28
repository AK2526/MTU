import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import CustomAIService from './Backend/custom';

// Cache for storing sentence-level synonyms
const SYNONYMS_CACHE = new Map();

// Simplified function to get synonyms for a sentence
const getSynonymsForSentence = async (sentence) => {
  const cacheKey = sentence.toLowerCase().trim();
  
  // Check cache first
  if (SYNONYMS_CACHE.has(cacheKey)) {
    return SYNONYMS_CACHE.get(cacheKey);
  }

  try {
    const synonymsObject = await CustomAIService.getSynonymsForSentence(sentence);
    
    // Cache valid results
    if (synonymsObject && typeof synonymsObject === 'object' && Object.keys(synonymsObject).length > 0) {
      SYNONYMS_CACHE.set(cacheKey, synonymsObject);
      return synonymsObject;
    }
    return {};
  } catch (error) {
    console.error('Error getting synonyms:', error);
    return {};
  }
};

// Component to render text with synonym tooltips (only for user entries)
const SynonymText = ({ text, colorClass, enableSynonyms = false }) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [synonyms, setSynonyms] = useState([]);
  const [sentenceSynonyms, setSentenceSynonyms] = useState({});
  const isLoadingRef = useRef(false);

  // Load synonyms when component mounts or text changes
  useEffect(() => {
    if (enableSynonyms && text && text.trim() && !isLoadingRef.current) {
      const cacheKey = text.toLowerCase().trim();
      
      if (SYNONYMS_CACHE.has(cacheKey)) {
        setSentenceSynonyms(SYNONYMS_CACHE.get(cacheKey));
      } else {
        loadSentenceSynonyms();
      }
    }
  }, [text, enableSynonyms]);

  const loadSentenceSynonyms = async () => {
    if (!text?.trim() || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      const synonymsData = await getSynonymsForSentence(text);
      if (synonymsData && Object.keys(synonymsData).length > 0) {
        setSentenceSynonyms(synonymsData);
      }
    } catch (error) {
      console.error('Error loading synonyms:', error);
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleWordHover = (e, word) => {
    if (!enableSynonyms) return;
    
    const cleanWord = word.toLowerCase().replace(/[.,!?;:"()]/g, '');
    
    if (sentenceSynonyms[cleanWord]) {
      const wordSynonyms = sentenceSynonyms[cleanWord];
      setHoveredWord(cleanWord);
      setSynonyms(wordSynonyms);
      
      const rect = e.target.getBoundingClientRect();
      const parentRect = e.target.closest('.entry-content').getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Calculate initial position
      let x = rect.left + rect.width / 2 - parentRect.left;
      const y = rect.top - parentRect.top - 10; // Further reduced offset from -12 to -10
      
      // Estimate tooltip width using the actual synonyms for this word
      const synonymText = wordSynonyms.join(' • ');
      const tooltipEstimatedWidth = Math.max(140, synonymText.length * 6.5 + 70); // Further reduced
      
      // Adjust x position to prevent going off-screen
      const tooltipLeftEdge = rect.left - tooltipEstimatedWidth / 2;
      const tooltipRightEdge = rect.left + tooltipEstimatedWidth / 2;
      
      if (tooltipLeftEdge < 10) {
        // Too far left, align to left edge with padding
        x = 10 - parentRect.left + tooltipEstimatedWidth / 2;
      } else if (tooltipRightEdge > viewportWidth - 10) {
        // Too far right, align to right edge with padding
        x = (viewportWidth - 10) - parentRect.left - tooltipEstimatedWidth / 2;
      }
      
      setTooltipPosition({ x, y });
    }
  };

  const handleWordLeave = () => {
    setHoveredWord(null);
    setSynonyms([]);
  };

  const renderTextWithSynonyms = (text) => {
    // Split text into sentences
    const sentences = text.split(/([.!?]+)/);
    
    return sentences.map((sentence, sentenceIndex) => {
      if (!sentence.trim() || /^[.!?]+$/.test(sentence)) {
        return <span key={sentenceIndex}>{sentence}</span>;
      }
      
      const words = sentence.split(/(\s+)/);
      
      return (
        <span key={sentenceIndex}>
          {words.map((word, index) => {
            const cleanWord = word.replace(/[.,!?;:"()]/g, '').toLowerCase();
            
            // Check if this word has synonyms available
            if (enableSynonyms && sentenceSynonyms[cleanWord] && word.trim()) {
              return (
                <span key={index} className="synonym-wrapper">
                  <span
                    className="synonym-word"
                    onMouseEnter={(e) => handleWordHover(e, word)}
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
            zIndex: 1000,
            padding: '4px 8px',
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontWeight: 'bold', color: '#ffd700' }}>Try:</span>
            <span>
              {synonyms.length > 0 ? (
                synonyms.map((synonym, index) => (
                  <span key={index}>
                    {synonym}
                    {index < synonyms.length - 1 ? ' • ' : ''}
                  </span>
                ))
              ) : (
                'No suggestions'
              )}
            </span>
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