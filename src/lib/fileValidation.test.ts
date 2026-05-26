import { describe, expect, it } from 'vitest';
import { validateSelectedFiles } from './fileValidation';

describe('fileValidation', () => {
  it('accepts configured file types and limits count', () => {
    const image = new File(['image'], 'answer.png', { type: 'image/png' });
    const pdf = new File(['pdf'], 'answer.pdf', { type: 'application/pdf' });

    expect(validateSelectedFiles([image, pdf], {
      acceptedTypes: ['image/*', 'application/pdf', '.pdf'],
      maxBytes: 1024,
      maxFiles: 2,
    })).toBeNull();

    expect(validateSelectedFiles([image, pdf], {
      acceptedTypes: ['image/*', 'application/pdf', '.pdf'],
      maxBytes: 1024,
      maxFiles: 1,
    })).toBe('Attach no more than 1 files.');
  });

  it('rejects unsupported, oversized, and duplicate pdf files', () => {
    const text = new File(['text'], 'notes.txt', { type: 'text/plain' });
    const oversized = new File(['x'.repeat(2048)], 'large.png', { type: 'image/png' });
    const pdfA = new File(['pdf'], 'a.pdf', { type: 'application/pdf' });
    const pdfB = new File(['pdf'], 'b.pdf', { type: 'application/pdf' });

    expect(validateSelectedFiles([text], {
      acceptedTypes: ['image/*'],
      maxBytes: 1024,
    })).toBe('notes.txt is not a supported file type.');

    expect(validateSelectedFiles([oversized], {
      acceptedTypes: ['image/*'],
      maxBytes: 1024,
    })).toBe('large.png exceeds the 1 KB file size limit.');

    expect(validateSelectedFiles([pdfA, pdfB], {
      acceptedTypes: ['application/pdf', '.pdf'],
      maxBytes: 1024,
    })).toBe('Attach only one PDF file.');
  });
});
