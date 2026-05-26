export type FileValidationOptions = {
  acceptedTypes: string[];
  maxBytes: number;
  maxFiles?: number;
  allowMultiplePdf?: boolean;
};

export function validateSelectedFiles(files: File[], options: FileValidationOptions) {
  if (options.maxFiles !== undefined && files.length > options.maxFiles) {
    return `Attach no more than ${options.maxFiles} files.`;
  }

  const invalidFile = files.find((file) => !isAcceptedFile(file, options.acceptedTypes));
  if (invalidFile) {
    return `${invalidFile.name} is not a supported file type.`;
  }

  const oversizedFile = files.find((file) => file.size > options.maxBytes);
  if (oversizedFile) {
    return `${oversizedFile.name} exceeds the ${formatBytes(options.maxBytes)} file size limit.`;
  }

  if (!options.allowMultiplePdf) {
    const pdfCount = files.filter(isPdfFile).length;
    if (pdfCount > 1) {
      return 'Attach only one PDF file.';
    }
  }

  return null;
}

export function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isAcceptedFile(file: File, acceptedTypes: string[]) {
  return acceptedTypes.some((type) => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', '/'));
    }

    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }

    return file.type === type;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  const megabytes = bytes / 1024 / 1024;
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}
