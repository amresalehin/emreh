declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface MammothOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: ArrayBuffer | Uint8Array;
    [key: string]: unknown;
  }

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { buffer: ArrayBuffer },
    options?: MammothOptions
  ): Promise<MammothResult>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { buffer: ArrayBuffer },
    options?: MammothOptions
  ): Promise<MammothResult>;

  const mammoth: {
    convertToHtml: typeof convertToHtml;
    extractRawText: typeof extractRawText;
  };

  export default mammoth;
}
