import { describe, it, expect } from 'vitest';
import { isValidTransition } from '../ticketValidation';
import { type KanbanTicket } from '../../store/useAppStore';

describe('ticketValidation state machine', () => {
  const baseTicket: KanbanTicket = {
    id: 'TEST-1',
    title: 'Test',
    description: 'Test desc',
    status: 'Open',
    type: 'Story',
    priority: 'Medium',
    assignee: 'Human Orchestrator',
    reporter: 'Human Orchestrator',
    history: []
  };

  it('allows transition to Canceled from any state', () => {
    expect(isValidTransition({ ...baseTicket, status: 'Open' }, 'Canceled')).toBe(true);
    expect(isValidTransition({ ...baseTicket, status: 'In Progress' }, 'Canceled')).toBe(true);
    expect(isValidTransition({ ...baseTicket, status: 'Done' }, 'Canceled')).toBe(true);
  });

  it('prevents transitioning past Open if ticket is Unassigned', () => {
    const unassignedTicket = { ...baseTicket, assignee: '' };
    expect(isValidTransition(unassignedTicket, 'Ready')).toBe(false);
    expect(isValidTransition(unassignedTicket, 'In Progress')).toBe(false);
    expect(isValidTransition(unassignedTicket, 'Open')).toBe(true);
  });

  it('allows transitioning past Open if ticket has an assignee', () => {
    const assignedTicket = { ...baseTicket, assignee: 'Agent Gemini' };
    expect(isValidTransition(assignedTicket, 'Ready')).toBe(true);
    expect(isValidTransition(assignedTicket, 'In Progress')).toBe(true);
  });

  it('prevents transitioning directly to Done from Open or Ready', () => {
    expect(isValidTransition({ ...baseTicket, status: 'Open' }, 'Done')).toBe(false);
    expect(isValidTransition({ ...baseTicket, status: 'Ready' }, 'Done')).toBe(false);
  });

  it('prevents Stories and Bugs from transitioning to Done unless they are in UAT', () => {
    expect(isValidTransition({ ...baseTicket, type: 'Story', status: 'In Progress' }, 'Done')).toBe(false);
    expect(isValidTransition({ ...baseTicket, type: 'Bug', status: 'Testing' }, 'Done')).toBe(false);
    
    // Should pass if in UAT
    expect(isValidTransition({ ...baseTicket, type: 'Story', status: 'UAT' }, 'Done')).toBe(true);
    expect(isValidTransition({ ...baseTicket, type: 'Bug', status: 'UAT' }, 'Done')).toBe(true);
  });

  it('allows other types (Tasks, Spikes) to transition to Done from In Progress or Testing', () => {
    expect(isValidTransition({ ...baseTicket, type: 'Task', status: 'In Progress' }, 'Done')).toBe(true);
    expect(isValidTransition({ ...baseTicket, type: 'Spike', status: 'Testing' }, 'Done')).toBe(true);
  });
});
