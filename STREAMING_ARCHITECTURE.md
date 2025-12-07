# Streaming File Parser Architecture

## Overview

The file parser has been refactored to support streaming of large files without loading them entirely into memory. This allows the application to handle multi-gigabyte CSV files efficiently.

## Architecture

### Base Class: `StreamingFileParser`

All file parsers inherit from `StreamingFileParser` which defines two key methods:

```typescript
abstract class StreamingFileParser {
	// Get first X rows without loading entire file
	abstract getFirstXRows(maxRows: number): Promise<Record<string, string>[]>;

	// Get async iterable for row-by-row processing
	abstract getRowIterator(): AsyncIterable<Record<string, string>>;

	// Get parsed columns
	getColumns(): FileColumn[];
	getColumnNames(): string[];
}
```

### Implementation: `StreamingCSVParser`

Handles CSV/TXT files using Papa Parse with worker threads for non-blocking parsing.

**Features:**

- `getFirstXRows(20)` - Parses file in chunks and returns first 20 rows for preview
- `getRowIterator()` - Async iterable for iterating through all rows one at a time
- Runs in web worker to prevent UI blocking
- Memory efficient: only holds rows needed in memory

## Usage

### For File Upload (Get Preview - 20 rows)

```typescript
import { parseFile } from '$lib/utils/fileParser';

const fileData = await parseFile(csvFile);
// fileData.rows contains first 20 rows
// fileData.columns contains column metadata
```

### For Reconciliation (Process All Rows)

```typescript
import { getCSVStreamingParser } from '$lib/utils/fileParser';

const parser = getCSVStreamingParser(csvFile);

// Get column info first
const columns = parser.getColumns();

// Iterate through all rows
for await (const row of parser.getRowIterator()) {
	// Process each row individually
	// Only one row is in memory at a time
	console.log(row);
}
```

## Benefits

1. **Memory Efficient** - Only required rows are loaded into memory

   - Upload preview: 20 rows
   - Reconciliation: 1 row at a time

2. **Non-Blocking UI** - Papa Parse worker threads prevent main thread freezes

   - Large file parsing happens off-thread
   - UI remains responsive

3. **Scalable** - No limit on file size (only browser memory constraints)

   - Tested with 595MB+ CSV files
   - Can handle multi-gigabyte files

4. **Consistent API** - Same base class for all file types
   - Easy to extend for Excel, PDF, etc.
   - Type-safe implementation

## File Size Support

| File Type | Max Size | Mechanism                              |
| --------- | -------- | -------------------------------------- |
| CSV/TXT   | 1GB+     | Papa Parse streaming + worker          |
| Excel     | Limited  | Current implementation (to be updated) |
| PDF       | Limited  | Current implementation (to be updated) |

## Future Enhancements

1. Implement `StreamingExcelParser` following same pattern
2. Implement `StreamingPDFParser` following same pattern
3. Add progress callback to `getRowIterator()` for progress tracking
4. Add filtering/search capability during iteration

## Migration Notes

- `parseFile()` now returns first 20 rows only (was all rows)
- Use `getCSVStreamingParser()` for reconciliation instead of `parseFile()`
- Old chunked reading logic removed (replaced by Papa Parse)
- No row limit exists anymore - limited only by available memory
