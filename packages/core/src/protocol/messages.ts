// ─── WebSocket Protocol Messages ──────────────────────────────────────────────
//
// Shared types for the CLI dev server ↔ Web app WebSocket protocol.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '../model/semantic.js';
import type { ValidationResult, CompletenessReport } from '../validator/types.js';

// ─── Server → Client ────────────────────────────────────────────────────────

export type ServerMessage =
    | ModelUpdateMessage
    | ValidationUpdateMessage
    | CompletenessUpdateMessage
    | ErrorMessage;

export interface ModelUpdateMessage {
    type: 'model:update';
    payload: MemoModelDTO;
}

export interface ValidationUpdateMessage {
    type: 'validation:update';
    payload: ValidationResult;
}

export interface CompletenessUpdateMessage {
    type: 'completeness:update';
    payload: CompletenessReport;
}

export interface ErrorMessage {
    type: 'error';
    payload: { message: string };
}

// ─── Client → Server ────────────────────────────────────────────────────────

export type ClientMessage =
    | RequestRefreshMessage;

export interface RequestRefreshMessage {
    type: 'request:refresh';
}
