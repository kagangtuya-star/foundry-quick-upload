export class UploadController {
  constructor(imagePipeline, storageAdapter, pathResolver, documentUpdater) {
    this.imagePipeline = imagePipeline;
    this.storageAdapter = storageAdapter;
    this.pathResolver = pathResolver;
    this.documentUpdater = documentUpdater;
  }

  async execute(request) {
    if (!request || !request.document) {
      throw new Error('Invalid upload request');
    }

    const { document, documentKind, field } = request;
    const name = request.name || document?.name || 'image';
    const file = request.file;

    if (!documentKind || !field) {
      throw new Error('Missing document metadata');
    }

    if (!file) {
      throw new Error('No image file provided');
    }

    if (!(file instanceof Blob) && typeof file !== 'string') {
      throw new Error('Unsupported image source');
    }

    // Resolve target path
    const path = this.pathResolver.resolve(documentKind, field);
    const filename = this.pathResolver.generateFilename(name, documentKind, field);

    // Process image (convert to webp)
    const processedBlob = await this.imagePipeline.process(file);

    // Upload to storage
    const { url } = await this.storageAdapter.upload(path, processedBlob, filename);

    // Update document field
    await this.documentUpdater.update(document, documentKind, field, url);

    return { url, filename, path };
  }
}
