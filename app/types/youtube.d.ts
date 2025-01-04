declare namespace YT {
  interface Player {
    getCurrentTime(): number;
  }

  interface PlayerConstructor {
    new (element: HTMLIFrameElement, config: PlayerConfig): Player;
  }

  interface PlayerConfig {
    events: {
      onStateChange: (event: OnStateChangeEvent) => void;
    };
  }

  interface OnStateChangeEvent {
    data: number;
  }

  interface PlayerState {
    PLAYING: number;
  }
}

interface Window {
  YT: {
    Player: YT.PlayerConstructor;
    PlayerState: YT.PlayerState;
  };
  onYouTubeIframeAPIReady: () => void;
} 