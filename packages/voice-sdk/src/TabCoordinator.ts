import EventEmitter from 'eventemitter3';

type CoordinatorEvents = {
  leaderElected: void;
  leaderDemoted: void;
};

export class TabCoordinator extends EventEmitter<CoordinatorEvents> {
  private channel: BroadcastChannel;
  private leaderId: string | null = null;
  private myId: string;
  private isLeaderFlag = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private electionTimeout?: NodeJS.Timeout;

  constructor(private channelName = 'voice-sdk-tabs') {
    super();
    this.myId = Math.random().toString(36).substring(2, 9);
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (ev) => this.handleMessage(ev.data);

    // Initial election check
    this.startElection();
  }

  get isLeader(): boolean {
    return this.isLeaderFlag;
  }

  private startElection() {
    // If no heartbeat heard within 150ms, declare self leader
    // (Assuming heartbeat is every 100ms)
    this.electionTimeout = setTimeout(() => {
      this.becomeLeader();
    }, 150);

    // Ask who is leader
    this.channel.postMessage({ type: 'WHO_IS_LEADER', from: this.myId });
  }

  private becomeLeader() {
    if (this.isLeaderFlag) return;
    this.isLeaderFlag = true;
    this.leaderId = this.myId;
    this.emit('leaderElected');

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.channel.postMessage({ type: 'HEARTBEAT', from: this.myId });
    }, 100);
  }

  private becomeFollower(leaderId: string) {
    if (this.isLeaderFlag) {
      this.isLeaderFlag = false;
      this.emit('leaderDemoted');
      clearInterval(this.heartbeatInterval);
    }
    this.leaderId = leaderId;

    // Reset election timeout on heartbeat
    clearTimeout(this.electionTimeout);
    this.electionTimeout = setTimeout(() => {
      // Leader died
      this.startElection();
    }, 300); // 3x heartbeat
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'HEARTBEAT':
        if (msg.from !== this.myId) {
          this.becomeFollower(msg.from);
        }
        break;
      case 'WHO_IS_LEADER':
        if (this.isLeaderFlag) {
          this.channel.postMessage({ type: 'HEARTBEAT', from: this.myId });
        }
        break;
    }
  }

  public close() {
    clearInterval(this.heartbeatInterval);
    clearTimeout(this.electionTimeout);
    this.channel.close();
  }
}
