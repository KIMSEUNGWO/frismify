declare module 'mux.js' {
  export namespace mp4 {
    export class Transmuxer {
      constructor(options?: any);
      on(event: string, callback: (data: any) => void): void;
      push(data: Uint8Array): void;
      flush(): void;
    }
  }
  const muxjs: { mp4: typeof mp4 };
  export default muxjs;
}