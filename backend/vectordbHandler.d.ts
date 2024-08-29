// Import necessary types from Express and AI.js
import { Router, Request, Response } from "express";
import { VectorDB } from "@themaximalist/ai.js";

// Declare a module for AI.js to ensure correct typing if AI.js does not provide its own types
declare module "@themaximalist/ai.js" {
  export class VectorDB {
    add(input: string): Promise<void>;
    embedding(input: string): Promise<number[]>;
    search(input: string, limit: number, threshold: number): Promise<SearchResult[]>;
  }

  export interface SearchResult {
    input: string;
    distance: number;
    object: any;
  }
}

// Type definition for the Express router in vectorHandler.js
declare const router: Router;

export default router;

/**
 * Utility function to log messages with a consistent format.
 * @param message - The message to log.
 */
declare function log(message: string): void;

/**
 * Initializes the vector database and populates it with sample data.
 * This function logs each step for transparency and debugging.
 */
declare function initDB(): Promise<void>;

/**
 * Express route handler to initialize the database via a POST request.
 * This route is intended to be called once to prepare the database.
 * @param req - Express request object.
 * @param res - Express response object.
 */
declare function initDBHandler(req: Request, res: Response): Promise<void>;

/**
 * Express route handler for searching the vector database via a POST request.
 * This route expects a 'query' in the request body and returns matching results.
 * @param req - Express request object.
 * @param res - Express response object.
 */
declare function searchDBHandler(req: Request, res: Response): Promise<void>;

/**
 * Global variable for the VectorDB instance.
 */
declare let db: VectorDB | undefined;
