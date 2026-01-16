export class StorageAdapter {
  get kind() {
    throw new Error('StorageAdapter.kind must be implemented');
  }

  async ensurePath(path) {
    throw new Error('StorageAdapter.ensurePath must be implemented');
  }

  async upload(path, file, filename) {
    throw new Error('StorageAdapter.upload must be implemented');
  }
}
