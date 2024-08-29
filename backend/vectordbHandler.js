import express from "express";
import AI from "@themaximalist/ai.js"; // Import AI.js
import ThinkableType from "@themaximalist/thinkabletype"; // Import ThinkableType
import fs from "fs/promises"; // Import fs to handle file operations

const router = express.Router();
let thinkabletype;
let db;

const log = (message) => {
  console.log(`[Server Log] ${message}`);
};

// Initialize ThinkableType with hyperedges loaded from a JSON file
const initDB = async () => {
  try {
    log("Initializing ThinkableType and VectorDB...");

    // Read the JSON file to get hyperedges
    const fileContent = await fs.readFile("data.json", "utf-8");
    const jsonData = JSON.parse(fileContent);
    const { hyperedges } = jsonData;

    thinkabletype = new ThinkableType({
      interwingle: ThinkableType.INTERWINGLE.ISOLATED, // Default mode
      hyperedges,
    });

    log("ThinkableType initialized successfully with hyperedges from JSON file.");

    // Initialize the vector database
    db = new AI.VectorDB();

    // Add symbols and hyperedges to the vector database with embeddings
    for (const edge of hyperedges) {
      const [start, relation, end] = edge;
      const edgeString = `${start} ${relation} ${end}`;
      log(`Adding edge to DB: "${edgeString}"`);
      log("Performing embedding...");
      await db.add(edgeString); // Add the full edge as a single string
      log("Embedding added to vector database.");
    }

    log("VectorDB initialized successfully with hyperedges.");
  } catch (error) {
    log(`Error during initialization: ${error.message}`);
    console.error(error.stack); // Log the stack trace for debugging
    throw error; // Re-throw the error to ensure it’s caught and handled appropriately.
  }
};

router.post("/init", async (req, res) => {
  try {
    await initDB();
    res.status(200).send({ message: "Database initialized successfully." });
  } catch (error) {
    log("Error initializing database.");
    res.status(500).send({ message: "Failed to initialize database." });
  }
});

router.post("/interwingle", async (req, res) => {
  try {
    const { type } = req.body;
    log(`Applying Interwingle type: "${type}"`);

    const fileContent = await fs.readFile("data.json", "utf-8");
    const jsonData = JSON.parse(fileContent);
    const { hyperedges } = jsonData;

    thinkabletype = new ThinkableType({
      interwingle: ThinkableType.INTERWINGLE[type],
      hyperedges,
    });

    const data = thinkabletype.graphData();
    log(`Interwingle ${type} applied. Returning results.`);
    res.status(200).send({ data });
  } catch (error) {
    log(`Error during Interwingle: ${error.message}`);
    console.error(error.stack); // Log the stack trace for debugging
    res.status(500).send({ message: "Interwingle failed." });
  }
});


// Search function
router.post("/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!db) {
      log("Database not initialized. Cannot perform search.");
      return res.status(500).send({ message: "Database is not initialized." });
    }

    log(`Performing search for query: "${query}"`);

    const results = await db.search(query, 10, 0.9);

    log("Search completed. Returning results to client.");
    res.status(200).send({ results });
  } catch (error) {
    log(`Error during search: ${error.message}`);
    console.error(error.stack);
    res.status(500).send({ message: "Search failed." });
  }
});


// PageRank example
router.post("/pagerank", async (req, res) => {
  try {
    log("Running PageRank on knowledge graph.");

    const thinkabletype = ThinkableType.parse(`A,B,C
A,B,D
A,B,E
A,C,Z`);

    await thinkabletype.sync(); // syncs pagerank
    const pageranks = thinkabletype.pageranks;
    log("PageRank completed. Returning results.");
    res.status(200).send({ pageranks });
  } catch (error) {
    log(`Error during PageRank: ${error.message}`);
    console.error(error.stack); // Log the stack trace for debugging
    res.status(500).send({ message: "PageRank failed." });
  }
});

// Endpoint to fetch graph data for visualization
router.post("/graph", (req, res) => {
  try {
    const data = thinkabletype.graphData(); // Get nodes and links for Force Graph 3D
    log("Graph data generated. Returning to client.");
    res.status(200).send({ data });
  } catch (error) {
    log(`Error generating graph data: ${error.message}`);
    console.error(error.stack); // Log the stack trace for debugging
    res.status(500).send({ message: "Failed to generate graph data." });
  }
});

export default router;
