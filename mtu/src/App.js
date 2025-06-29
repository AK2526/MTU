import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import CustomAIService from './Backend/custom';
import DatabaseService from './Backend/database';
import AIService from './Backend/AI';

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
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showNotebooksList, setShowNotebooksList] = useState(false);
  const [availableNotebooks, setAvailableNotebooks] = useState([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const leftNotebookRef = useRef(null);
  const rightNotebookRef = useRef(null);
  const inputRef = useRef(null);
  const sessionCreatedRef = useRef(false); // Track if session has been created
  const saveTimeoutRef = useRef(null); // Track save timeout

  // Enhanced save function that saves current vocabulary
  const saveCurrentSessionWithRetry = async (retryCount = 0, maxRetries = 2, generateSmartTitle = false) => {
    if (!currentSessionId) {
      console.log("No session ID to save to - no entries have been created yet");
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      // Convert synonyms cache to a plain object for storage
      const vocabularyData = {};
      for (const [key, value] of SYNONYMS_CACHE.entries()) {
        vocabularyData[key] = value;
      }

      const vocabularyCount = Object.keys(vocabularyData).length;
      console.log(`📚 Saving ${vocabularyCount} vocabulary entries from cache`);

      // Generate smart title from conversation history only if explicitly requested
      const generateTitle = async () => {
        if (!generateSmartTitle) {
          // For automatic saves, keep the existing title format
          return `Journal Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        }
        
        if (conversationHistory.length === 0) {
          return `Journal Session ${new Date().toLocaleDateString()}`;
        }
        
        try {
          // Use AI to generate a smart title based on chat history
          console.log("🤖 Generating AI title from conversation history...");
          const titlePrompt = `Based on this conversation history, generate a short, meaningful title (3-6 words max) that captures the main topic or theme. Return ONLY the title, no quotes, no extra text, no explanation.

Conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.message || msg.content || ''}`).join('\n')}

Title:`;
          console.log("📝 Title prompt:", titlePrompt);
          console.log("📚 Conversation history:", conversationHistory);
          const aiTitle = await AIService.generateText(titlePrompt);
          
          if (aiTitle && aiTitle.trim()) {
            // Clean up the AI response and add date
            const cleanTitle = aiTitle.trim()
              .replace(/^["']|["']$/g, '') // Remove quotes from start/end
              .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
              .replace(/[.!?]+$/, ''); // Remove trailing punctuation
            
            if (cleanTitle && cleanTitle.length > 0) {
              return `${cleanTitle} - ${new Date().toLocaleDateString()}`;
            }
          }
        } catch (error) {
          console.error("Error generating AI title:", error);
        }
        
        // Fallback to first message if AI fails
        const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
        if (firstUserMessage && (firstUserMessage.message || firstUserMessage.content) && typeof (firstUserMessage.message || firstUserMessage.content) === 'string') {
          const messageText = firstUserMessage.message || firstUserMessage.content;
          const words = messageText.split(' ').slice(0, 5).join(' ');
          return `${words}... - ${new Date().toLocaleDateString()}`;
        }
        
        return `Journal Session ${new Date().toLocaleDateString()}`;
      };

      const sessionData = {
        title: await generateTitle(),
        leftEntries: leftEntries,
        rightEntries: rightEntries,
        conversationHistory: conversationHistory,
        vocabularyData: vocabularyData, // Include all cached vocabulary
        lastUpdated: new Date().toISOString()
      };

      await DatabaseService.updateNotebook(currentSessionId, sessionData);
      console.log("💾 Session saved successfully:", currentSessionId);
      console.log(`📚 Saved ${vocabularyCount} vocabulary entries`);
      console.log(`📝 Title: "${sessionData.title}"`);
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  // Load all available notebooks from Firebase
  const loadAvailableNotebooks = async () => {
    setIsLoadingNotebooks(true);
    try {
      const notebooks = await DatabaseService.getAllNotebooks();
      console.log("📚 Loaded notebooks:", notebooks);
      setAvailableNotebooks(notebooks);
      setShowNotebooksList(true);
    } catch (error) {
      console.error("Error loading notebooks:", error);
      alert("Failed to load notebooks. Please try again.");
    } finally {
      setIsLoadingNotebooks(false);
    }
  };

  // Load a specific session and replace current content
  const loadSession = async (sessionId) => {
    try {
      console.log("🔄 Loading session:", sessionId);
      
      // First, save current session if it has content
      if (leftEntries.length > 0 || rightEntries.length > 0) {
        console.log("💾 Saving current session before switching...");
        await saveCurrentSessionWithRetry(0, 2, false); // Don't generate smart title for auto-save
      }

      // Load the selected session
      const sessionData = await DatabaseService.getNotebook(sessionId);
      console.log("📖 Loaded session data:", sessionData);

      if (sessionData) {
        // Update all state with loaded data
        // Convert timestamps back to Date objects for entries
        const leftEntriesWithDates = (sessionData.leftEntries || []).map(entry => ({
          ...entry,
          timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
        }));
        
        const rightEntriesWithDates = (sessionData.rightEntries || []).map(entry => ({
          ...entry,
          timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
        }));

        setLeftEntries(leftEntriesWithDates);
        setRightEntries(rightEntriesWithDates);
        setConversationHistory(sessionData.conversationHistory || []);
        setCurrentSessionId(sessionId);

        // Load vocabulary data back into cache
        if (sessionData.vocabularyData) {
          SYNONYMS_CACHE.clear(); // Clear existing cache
          for (const [key, value] of Object.entries(sessionData.vocabularyData)) {
            SYNONYMS_CACHE.set(key, value);
          }
          console.log(`📚 Restored ${Object.keys(sessionData.vocabularyData).length} vocabulary entries to cache`);
        }

        console.log("✅ Session loaded successfully");
        setShowNotebooksList(false);
      } else {
        alert("Failed to load session data");
      }
    } catch (error) {
      console.error("Error loading session:", error);
      alert("Failed to load session. Please try again.");
    }
  };

  // Create a new session only when needed (first entry)
  const createNewSession = async () => {
    // Prevent creating multiple sessions (React StrictMode runs useEffect twice)
    if (sessionCreatedRef.current || currentSessionId) {
      console.log("Session already exists, skipping creation");
      return currentSessionId;
    }
    
    sessionCreatedRef.current = true;
    
    try {
      const sessionData = {
        title: `Journal Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        leftEntries: [],
        rightEntries: [],
        conversationHistory: []
      };
      
      const sessionId = await DatabaseService.saveNotebookSession(sessionData);
      setCurrentSessionId(sessionId);
      console.log("📝 New session created:", sessionId);
      return sessionId;
    } catch (error) {
      console.error("Error creating new session:", error);
      sessionCreatedRef.current = false; // Reset on error
      return null;
    }
  };

  const handleSubmit = async () => {
    if (currentInput.trim() && !isLoading) {
      // Create session if it doesn't exist yet (first entry)
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createNewSession();
        if (!sessionId) {
          console.error("Failed to create session, cannot save entry");
          return;
        }
      }

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
        console.log("💬 Updated conversation history:", aiResult.updatedHistory);
        
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

  // Focus input on component mount (but don't create session until first entry)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []); // Empty dependency array ensures this runs only once

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      {/* Header with navigation */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <button
          onClick={loadAvailableNotebooks}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          }}
        >
          📚 My Notebooks
        </button>
        <button
          onClick={() => saveCurrentSessionWithRetry(0, 2, true)}
          style={{
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          }}
        >
          💾 Save Session
        </button>
      </div>

      <div className="notebooks-container" style={{ marginTop: '80px' }}>
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

      {/* Notebooks List Modal */}
      {showNotebooksList && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #eee',
              paddingBottom: '16px'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>📚 Your Notebooks</h2>
              <button
                onClick={() => setShowNotebooksList(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {isLoadingNotebooks ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div>🔄 Loading notebooks...</div>
              </div>
            ) : availableNotebooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div>📖 No saved notebooks found</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Start writing entries to create your first notebook!
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
                  Click on any notebook to load it:
                </div>
                {availableNotebooks.map((notebook, index) => (
                  <div
                    key={notebook.id}
                    onClick={() => loadSession(notebook.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #eee',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: currentSessionId === notebook.id ? '#e3f2fd' : 'white'
                    }}
                    onMouseEnter={(e) => {
                      if (currentSessionId !== notebook.id) {
                        e.target.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentSessionId !== notebook.id) {
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {currentSessionId === notebook.id && <span style={{ color: '#2196F3' }}>▶</span>}
                      {notebook.title || `Notebook ${index + 1}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      {notebook.lastUpdated ? 
                        `Last updated: ${new Date(notebook.lastUpdated).toLocaleDateString()} ${new Date(notebook.lastUpdated).toLocaleTimeString()}` 
                        : 'No update time'
                      }
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {(notebook.leftEntries?.length || 0)} entries • {Object.keys(notebook.vocabularyData || {}).length} vocabulary words
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
