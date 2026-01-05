import type { RTCSession } from 'jssip/lib/RTCSession';
import type { CallSession, CallState, CallSummary } from './types';

export class SimpleCallSession implements CallSession {
  public id: string;
  public direction: 'inbound' | 'outbound';
  public state: CallState = 'new';
  public startTime: number;
  public answerTime?: number;
  public endTime?: number;
  public localStream?: MediaStream;
  public remoteStream?: MediaStream;

  constructor(
    private session: RTCSession,
    direction: 'inbound' | 'outbound',
    private pcConfig?: any
  ) {
    this.id = session.id;
    this.direction = direction;
    this.startTime = Date.now();
  }

  async answer(options?: { audio?: boolean }): Promise<void> {
    this.session.answer({
      pcConfig: this.pcConfig,
      mediaConstraints: options?.audio === false ? { audio: false } : undefined
    });
    this.state = 'established';
    this.answerTime = Date.now();
  }

  async hangup(): Promise<void> {
    this.session.terminate();
    this.state = 'ended';
    this.endTime = Date.now();
  }

  async hold(): Promise<void> {
    this.session.hold();
    this.state = 'held';
  }

  async resume(): Promise<void> {
    this.session.unhold();
    this.state = 'established';
  }

  async mute(): Promise<void> {
    this.session.mute();
    this.state = 'muted';
  }

  async unmute(): Promise<void> {
    this.session.unmute();
    this.state = 'established';
  }

  async sendDTMF(tone: string): Promise<void> {
    this.session.sendDTMF(tone);
  }

  async transfer(target: string): Promise<void> {
    this.session.refer(target);
  }

  getSummary(): CallSummary {
    const end = this.endTime || Date.now();
    const start = this.answerTime || this.startTime; // Duration counts from answer if answered, else start

    // Simple duration logic: if answered, duration = end - answer. If not, duration = 0?
    // Usually for billing/activities, duration is talk time.
    let duration = 0;
    let result: CallSummary['result'] = 'Failed';

    if (this.state === 'established' || this.answerTime) {
      result = 'Answered';
      duration = Math.floor((end - (this.answerTime || this.startTime)) / 1000);
    } else if (this.direction === 'inbound') {
      result = 'Missed'; // Default for unanswered inbound
      if (this.state === 'failed') result = 'Failed'; // Or rejected?
      // Check SIP cause codes if available, but for now simplify
    } else {
      // Outbound unanswered
      result = 'Failed'; // or 'Busy' or 'No Answer'
    }

    // Refine result based on session termination cause if possible
    // (This example assumes simple state mapping)

    return {
      id: this.id,
      direction: this.direction,
      from: this.session.remote_identity.uri.toString(), // Simplified
      to: this.session.local_identity.uri.toString(),   // Simplified
      startTime: this.startTime,
      answerTime: this.answerTime,
      endTime: this.endTime,
      duration,
      result
    };
  }
}
