declare global {
  interface Window {
    runtime: {
      EventsOn(eventName: string, callback: (...data: any[]) => void): void;
      EventsOff(eventName: string, ...additional: string[]): void;
    };
    go: {
      main: {
        App: {
          GetLogfileText(): Promise<string>;
        };
      };
    };
  }
}

export {};
