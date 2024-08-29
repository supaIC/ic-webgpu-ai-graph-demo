// Import necessary types from Express
import { Application } from "express";

/**
 * Express application instance.
 */
declare const app: Application;

/**
 * Configures the Express application with necessary middlewares and routes.
 */
declare function configureApp(): void;

/**
 * Starts the Express server on the specified port.
 * @param port - The port number on which the server should listen.
 */
declare function startServer(port: number): void;

export { app, configureApp, startServer };
