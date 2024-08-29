import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ForceGraph3D from "react-force-graph-3d";

// Set up Axios with the correct base URL for the backend
const api = axios.create({
  baseURL: "http://localhost:3001", // Directly specify your backend URL here
});

type SearchResult = {
  input: string;
  distance: number;
  object: any; // Adjust this based on your specific needs or structure of the object
};

export function MainPage() {
  const [searchResult, setSearchResult] = useState<SearchResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [graphData, setGraphData] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);

  const worker = useRef<Worker | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const log = (message: string) => {
    console.log(`[Client Log] ${message}`);
  };

  const initializeDB = async () => {
    try {
      log("Initializing database...");
      setStatusMessage("Initializing database...");
      await api.post("/api/init", {}, {
        headers: {
          "Content-Type": "application/json",
        }
      });
      log("Database initialized successfully.");
      setStatusMessage("Database initialized successfully.");
    } catch (error) {
      log("Error initializing database.");
      setStatusMessage("Error initializing database.");
      console.error("Error initializing the database:", error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    try {
      log(`Initiating search for: "${searchQuery}"...`);
      setStatusMessage(`Searching for: "${searchQuery}"...`);
      const response = await api.post("/api/search", { query: searchQuery }, {
        headers: {
          "Content-Type": "application/json",
        }
      });
      setSearchResult(response.data.results || []); // Safely handle missing results
      log(`Search completed for: "${searchQuery}".`);
      setStatusMessage(`Search completed for: "${searchQuery}".`);
    } catch (error) {
      log("Error performing search.");
      setStatusMessage("Error performing search.");
      console.error("Error performing search:", error);
    }
  };

  const performRandomTestSearch = async () => {
    log("Performing a random test search...");
    setStatusMessage("Performing a random test search...");
    const testQueries = [
      "founded DFINITY Foundation",
      "launched Mainnet",
      "uses WebAssembly",
      "supports ICP Tokens",
      "Awarded 100k grant",
      "Built Lucid Journal",
      "baseball"
    ];

    const randomQuery = testQueries[Math.floor(Math.random() * testQueries.length)];
    await handleSearch(randomQuery);
  };

  const handleInterwingle = async (type: string) => {
    try {
      log(`Applying Interwingle type: "${type}"...`);
      setStatusMessage(`Applying Interwingle type: "${type}"...`);
      const response = await api.post("/api/interwingle", { type });
      setGraphData(response.data.data);
      log(`Interwingle ${type} applied successfully.`);
      setStatusMessage(`Interwingle ${type} applied successfully.`);
    } catch (error) {
      log("Error applying Interwingle.");
      setStatusMessage("Error applying Interwingle.");
      console.error("Error applying Interwingle:", error);
    }
  };
  
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./llm.js', import.meta.url), { type: 'module' });
    }

    const onMessageReceived = (e: MessageEvent) => {
      switch (e.data.status) {
        case 'loading':
          setStatus('loading');
          setLoadingMessage(e.data.data);
          break;

        case 'initiate':
          setProgressItems(prev => [...prev, e.data]);
          break;

        case 'progress':
          setProgressItems(prev => prev.map(item => {
            if (item.file === e.data.file) {
              return { ...item, ...e.data };
            }
            return item;
          }));
          break;

        case 'done':
          setProgressItems(prev => prev.filter(item => item.file !== e.data.file));
          break;

        case 'ready':
          setStatus('ready');
          break;

        case 'start':
          setMessages(prev => [...prev, { "role": "assistant", "content": "" }]);
          break;

        case 'update':
          const { output, tps, numTokens } = e.data;
          setTps(tps);
          setNumTokens(numTokens);
          setMessages(prev => {
            const cloned = [...prev];
            const last = cloned.at(-1);
            cloned[cloned.length - 1] = { ...last, content: last.content + output };
            return cloned;
          });
          break;

        case 'complete':
          setIsRunning(false);
          break;

        default:
          console.error(`Unknown message status: ${e.data.status}`);
      }
    };

    worker.current.addEventListener('message', onMessageReceived);

    return () => {
      if (worker.current) {
        worker.current.removeEventListener('message', onMessageReceived);
      }
    };
  }, []);

  useEffect(() => {
    if (messages.filter(x => x.role === 'user').length === 0) return;
    if (messages.at(-1).role === 'assistant') return;
    setTps(null);
    worker.current?.postMessage({ type: 'generate', data: messages });
  }, [messages, isRunning]);

  useEffect(() => {
    if (!chatContainerRef.current || !isRunning) return;
    const element = chatContainerRef.current;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 120) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isRunning]);

  const onEnter = async (message: string) => {
    // Perform a search with the user input
    await handleSearch(message);
  
    let fullMessage = message;
  
    // Add context from the search results if available
    if (searchResult.length > 0) {
      const contextMessage = `Context from search results: ${searchResult
        .map(result => result.input)
        .join('. ')}.\n\n`;
      fullMessage = contextMessage + message;
    }
  
    // Update messages with user input and context
    setMessages(prev => [...prev, { "role": "user", "content": fullMessage }]);
    setTps(null);
    setIsRunning(true);
    setInput('');
  
    console.log("Message with context sent to LLM:", fullMessage); // Debugging log
  };  

  const onInterrupt = () => {
    worker.current?.postMessage({ type: 'interrupt' });
  };

  const resizeInput = () => {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    target.style.height = 'auto';
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    resizeInput();
  }, [input]);

  return (
    <div className="app">
      <div className="content">
        {/* Status and Search Results */}
        <div className="status-results-container">
          <div className="status">
            <h2>Status:</h2>
            <p>{statusMessage || "No actions performed yet."}</p>
          </div>

          <div className="results">
            <h2>Search Results:</h2>
            {searchResult.length > 0 ? (
              searchResult.map((result, index) => (
                <div key={index}>
                  <p>
                    <strong>Match:</strong> {result.input} <br />
                    <strong>Distance:</strong> {result.distance} <br />
                    <strong>Metadata:</strong> {JSON.stringify(result.object)}
                  </p>
                </div>
              ))
            ) : (
              <p>No results found</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="actions">
          <h2>Initialization</h2>
          <button onClick={initializeDB} disabled={status === "loading"}>Initialize Database</button>

          <h2>Random Search Test</h2>
          <button onClick={performRandomTestSearch} disabled={status === "loading"}>Test Search</button>

          <h2>Interwingle Tests</h2>
          <button onClick={() => handleInterwingle("ISOLATED")} disabled={status === "loading"}>Isolated</button>
          <button onClick={() => handleInterwingle("CONFLUENCE")} disabled={status === "loading"}>Confluence</button>
          <button onClick={() => handleInterwingle("FUSION")} disabled={status === "loading"}>Fusion</button>
          <button onClick={() => handleInterwingle("BRIDGE")} disabled={status === "loading"}>Bridge</button>

        </div>

        {/* Model Loading and Messaging UI */}
        {status === null && messages.length === 0 && (
          <div className="model-load-section">
            <div className="model-info">
              <h1 className="model-title">Phi-3 WebGPU</h1>
              <h2 className="model-subtitle">
                A private and powerful AI chatbot that runs locally in your browser.
              </h2>
            </div>
            <div className="model-description">
              <p>
                You are about to load{" "}
                <a
                  href="https://huggingface.co/Xenova/Phi-3-mini-4k-instruct"
                  target="_blank"
                  rel="noreferrer"
                  className="link"
                >
                  Phi-3-mini-4k-instruct
                </a>
                , a 3.82 billion parameter LLM optimized for inference on the
                web. Once downloaded, the model (2.3&nbsp;GB) will be cached and reused when you revisit the page.
              </p>
              <button
                className="model-load-button"
                onClick={() => {
                  worker.current?.postMessage({ type: "load" });
                  setStatus("loading");
                }}
                disabled={status !== null}
              >
                Load model
              </button>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="loading-section">
            <p className="loading-message">{loadingMessage}</p>
            {progressItems.map(({ file, progress, total }, i) => (
              <div key={i} className="progress-item">
                <p>{file}</p>
                <progress value={progress} max={total}></progress>
              </div>
            ))}
          </div>
        )}

        {status === "ready" && (
          <div ref={chatContainerRef} className="chat-section">
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <p key={index}>
                  <strong>{msg.role}:</strong> {msg.content}
                </p>
              ))}
            </div>
            <p className="chat-info">
              {tps && messages.length > 0 && (
                <>
                  {!isRunning && (
                    <span>
                      Generated {numTokens} tokens in {(numTokens! / tps!).toFixed(2)} seconds&nbsp;&#40;
                    </span>
                  )}
                  <>
                    <span className="tps-info">{tps!.toFixed(2)}</span>
                    <span> tokens/second</span>
                  </>
                  {!isRunning && (
                    <>
                      <span>&#41;.</span>
                      <button
                        className="reset-button"
                        onClick={() => {
                          worker.current?.postMessage({ type: "reset" });
                          setMessages([]);
                        }}
                      >
                        Reset
                      </button>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        )}

        <div className="input-section">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Type your message..."
            value={input}
            disabled={status !== "ready"}
            onKeyDown={(e) => {
              if (input.length > 0 && !isRunning && e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onEnter(input);
              }
            }}
            // @ts-ignore
            onInput={(e) => setInput(e.target.value)}
          />
          {isRunning ? (
            <button className="input-button" onClick={onInterrupt}>
              Stop
            </button>
          ) : (
            <button className="input-button" onClick={() => onEnter(input)} disabled={input.length === 0}>
              Send
            </button>
          )}
        </div>

        <p className="disclaimer">Disclaimer: Generated content may be inaccurate or false.</p>

        {graphData ? (
          <ForceGraph3D
            graphData={graphData}
            nodeAutoColorBy="group"
            nodeOpacity={0.9}
            nodeResolution={16}
            nodeVal={(node) => node.importance || 1}
            linkDirectionalParticles={4}
            linkDirectionalParticleSpeed={0.006}
            linkWidth={2}
            linkOpacity={0.5}
            linkCurvature={0.25}
            linkDirectionalArrowLength={8}
            linkDirectionalArrowRelPos={1}
            backgroundColor="#000011"
            showNavInfo={false}
            onNodeClick={(node) => alert(`Node clicked: ${node.id}`)}
            nodeThreeObjectExtend={true}
          />
        ) : (
          <p>No graph data available</p>
        )}
      </div>
    </div>
  );
}
