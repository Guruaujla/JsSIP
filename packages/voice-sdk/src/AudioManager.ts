export class AudioManager {
  private remoteAudio: HTMLAudioElement;
  private ringtoneAudio?: HTMLAudioElement;

  constructor(private options?: { ringtoneUrl?: string }) {
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;

    if (this.options?.ringtoneUrl) {
      this.ringtoneAudio = new Audio(this.options.ringtoneUrl);
      this.ringtoneAudio.loop = true;
    }
  }

  setRemoteStream(stream: MediaStream | null): void {
    if (stream) {
      this.remoteAudio.srcObject = stream;
      this.remoteAudio.play().catch(e => {
        console.warn('VoiceSDK: Auto-play failed (user interaction needed)', e);
      });
    } else {
      this.remoteAudio.srcObject = null;
    }
  }

  async playRinging(): Promise<void> {
    if (this.ringtoneAudio) {
      try {
        await this.ringtoneAudio.play();
      } catch (e) {
        console.warn('VoiceSDK: Ringtone play failed', e);
      }
    }
  }

  stopRinging(): void {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio.currentTime = 0;
    }
  }
}
