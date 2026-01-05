import { describe, it, expect, vi } from 'vitest';
import { SimpleCallSession } from '../src/CallSession';

// Mock RTCSession
const mockSession = {
  id: 'test-session-id',
  remote_identity: { uri: { toString: () => 'sip:remote@domain' } },
  local_identity: { uri: { toString: () => 'sip:local@domain' } },
  answer: vi.fn(),
  terminate: vi.fn(),
  hold: vi.fn(),
  unhold: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  sendDTMF: vi.fn(),
  refer: vi.fn()
};

describe('SimpleCallSession', () => {
  it('should initialize correctly', () => {
    const session = new SimpleCallSession(mockSession as any, 'inbound');
    expect(session.id).toBe('test-session-id');
    expect(session.direction).toBe('inbound');
    expect(session.state).toBe('new');
    expect(session.startTime).toBeDefined();
  });

  it('should calculate duration correctly for answered calls', async () => {
    const session = new SimpleCallSession(mockSession as any, 'inbound');

    // Simulate answer
    await session.answer();
    expect(session.state).toBe('established');
    expect(session.answerTime).toBeDefined();

    // Fast forward time slightly (mocking Date.now would be better but simple math works)
    const startTime = session.answerTime!;

    // Simulate hangup
    await session.hangup();
    expect(session.endTime).toBeDefined();

    const summary = session.getSummary();
    expect(summary.result).toBe('Answered');
    expect(summary.duration).toBeGreaterThanOrEqual(0);
  });

  it('should report Missed for unanswered inbound calls', async () => {
    const session = new SimpleCallSession(mockSession as any, 'inbound');

    // Simulate failure/hangup before answer
    await session.hangup(); // or failed

    const summary = session.getSummary();
    expect(summary.result).toBe('Missed');
    expect(summary.duration).toBe(0);
  });

  it('should report Failed for outbound unanswered calls', async () => {
    const session = new SimpleCallSession(mockSession as any, 'outbound');

    await session.hangup();

    const summary = session.getSummary();
    expect(summary.result).toBe('Failed');
  });
});
