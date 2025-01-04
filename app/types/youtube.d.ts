interface YT {
  Player: {
    new (element: HTMLIFrameElement, config: {
      events: {
        onStateChange: (event: { data: number }) => void;
      };
    }): {
      getCurrentTime: () => number;
    };
  };
  PlayerState: {
    PLAYING: number;
  };
}

interface Window {
  YT: YT;
  onYouTubeIframeAPIReady: () => void;
} 