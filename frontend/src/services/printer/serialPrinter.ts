/**
 * WebSerial ESC/POS Thermal Printer Transport (COM / USB-Serial)
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 */

export class SerialPrinterTransport {
  private port: any = null;
  private writer: any = null;

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public async connect(baudRate: number = 9600): Promise<boolean> {
    if (!SerialPrinterTransport.isSupported()) {
      throw new Error('WebSerial is not supported on this browser or platform');
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });
      this.writer = this.port.writable.getWriter();
      return true;
    } catch (err: any) {
      console.warn('[AKEH-HMS] WebSerial Connection warning:', err);
      throw err;
    }
  }

  public isConnected(): boolean {
    return this.port !== null && this.writer !== null;
  }

  public async print(data: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
    if (!this.writer) {
      throw new Error('Serial printer writer unavailable');
    }
    await this.writer.write(data);
  }

  public async disconnect(): Promise<void> {
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }
}
