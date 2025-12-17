declare module 'm3u8-parser' {
  export class Parser {
    push(chunk: string): void;
    end(): void;
    manifest: {
      segments?: Array<{
        uri: string;
        duration?: number;
        [key: string]: any;
      }>;
      [key: string]: any;
    };
  }
  const m3u8Parser: { Parser: typeof Parser };
  export default m3u8Parser;
}