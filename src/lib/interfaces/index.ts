/**
 * Interfaces for dependency injection
 * These allow the same core logic to work in Electron and CLI environments
 */

export type { IAgentRunner, QueryParams, QueryResult, EvalParams, EvalResult } from './IAgentRunner';
export type { IFileSystem, FileInfo, LoadedContext } from './IFileSystem';
