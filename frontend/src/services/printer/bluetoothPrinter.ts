/**
 * WebBluetooth ESC/POS Direct Thermal Printer Transport
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 */

export class BluetoothPrinterTransport {
  private device: any = null;
  private characteristic: any = null;

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public async connect(): Promise<boolean> {
    if (!BluetoothPrinterTransport.isSupported()) {
      throw new Error('WebBluetooth is not supported on this browser or platform');
    }

    try {
      // Standard Serial Port Profile / ESC POS Bluetooth service UUIDs
      this.device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ]
      });

      const server = await this.device.gatt.connect();
      const services = await server.getPrimaryServices();

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
        if (writeChar) {
          this.characteristic = writeChar;
          break;
        }
      }

      if (!this.characteristic) {
        throw new Error('No writable Bluetooth printer characteristic found');
      }

      return true;
    } catch (err: any) {
      console.warn('[AKEH-HMS] WebBluetooth Connection warning:', err);
      throw err;
    }
  }

  public isConnected(): boolean {
    return this.device !== null && this.device.gatt?.connected && this.characteristic !== null;
  }

  public async print(data: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
    if (!this.characteristic) {
      throw new Error('Bluetooth printer characteristic not ready');
    }

    // BLE MTU packet chunking (typically 20 to 128 bytes per chunk)
    const chunkSize = 64;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
      this.device = null;
      this.characteristic = null;
    }
  }
}
