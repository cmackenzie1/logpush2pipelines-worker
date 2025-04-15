# Logpush to Pipelines

A Cloudflare Worker that receives compressed log data from Cloudflare Logpush and forwards it to Cloudflare Pipelines for processing.

## Overview

This worker acts as a bridge between Cloudflare Logpush and Cloudflare Pipelines. It:

1. Receives compressed log data from Logpush
2. Decompresses the data
3. Parses the log records
4. Chunks the records into manageable sizes (1MB max == 1M bytes)
5. Sends the chunks to a configured Pipeline with retry logic

## Features

- Handles compressed log data from Cloudflare Logpush
- Automatically chunks large log payloads to stay within size limits
- Implements retry logic for failed pipeline sends
- Provides detailed logging for monitoring and debugging

## Requirements

- Cloudflare Workers account
- Cloudflare Pipelines binding configured
- Node.js and pnpm for development

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Configure your Cloudflare Worker with a Pipeline binding named `PIPELINE`
4. Deploy the worker to your Cloudflare account

## Configuration

The worker requires a Pipeline binding to be configured in your Cloudflare Workers settings. The binding should be named `PIPELINE`.

## Development

To run the worker locally:

```
pnpm run dev
```

To deploy the worker:

```
pnpm run deploy
```

## Architecture

The worker processes incoming log data in the following steps:

1. **Decompression**: Uses `fflate` to decompress the incoming request body
2. **Parsing**: Converts the decompressed data into JSON log records
3. **Chunking**: Splits large log payloads into 1MB chunks to avoid size limitations
4. **Sending**: Forwards each chunk to the configured Pipeline with retry logic

## Error Handling

The worker implements a retry mechanism for failed Pipeline sends:

- Maximum of 3 retry attempts
- Detailed error logging for failed operations
- Graceful handling of missing Pipeline bindings

## License

[MIT License](LICENSE)
