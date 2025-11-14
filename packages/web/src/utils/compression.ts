/**
 * Compression and encoding utilities for URL state management
 */

/**
 * Compresses and encodes text data for URL sharing
 * @param text - The text to compress and encode
 * @returns Base64-encoded compressed data
 * @throws Error if compression fails
 */
export async function compressAndEncode(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });

    const compressedStream = stream.pipeThrough(
      new CompressionStream('gzip')
    );

    const chunks: Uint8Array[] = [];
    const reader = compressedStream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
    }

    const compressed = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }

    return btoa(String.fromCharCode(...compressed));
  } catch (error) {
    throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decodes and decompresses base64-encoded data
 * @param encoded - Base64-encoded compressed data
 * @returns Decompressed text
 * @throws Error if decoding or decompression fails
 */
export async function decodeAndDecompress(encoded: string): Promise<string> {
  try {
    // Decode base64
    const compressed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressed);
        controller.close();
      }
    });

    const decompressedStream = stream.pipeThrough(
      new DecompressionStream('gzip')
    );

    const chunks: Uint8Array[] = [];
    const reader = decompressedStream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
    }

    const decompressed = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    return decoder.decode(decompressed);
  } catch (error) {
    if (error instanceof Error && error.message.includes('atob')) {
      throw new Error('Invalid base64 encoding');
    }
    throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
