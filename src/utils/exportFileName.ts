import * as FileSystem from 'expo-file-system';

/** Give print-generated PDFs descriptive filenames before they reach Share/Save. */
export async function nameExportedPdf(uri: string, label: string): Promise<string> {
  const safeLabel = label
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'JobTracker-Export';
  const destination = `${FileSystem.cacheDirectory}${safeLabel}.pdf`;
  // expo-print generates randomly named PDF files; copy to a readable name.
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}
