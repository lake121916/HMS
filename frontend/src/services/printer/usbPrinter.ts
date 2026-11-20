/**
 * WebUSB ESC/POS Direct Thermal Printer Transport
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 */

export class UsbPrinterTransport {
  private device: any = null;
  private endpointNumber: number = 1;

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  public async connect(): Promise<boolean> {
    if (!UsbPrinterTransport.isSupported()) {
      throw new Error('WebUSB is not supported on this browser or platform');
    }

    try {
      // Request USB thermal printer device (class 7 is printer)
      this.device = await (navigator as any).usb.requestDevice({
        filters: [{ classCode: 7 }]
      });

      await this.device.open();
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Claim first available interface
      await this.device.claimInterface(0);

      // Locate OUT endpoint
      const iface = this.device.configuration.interfaces[0];
      const alternate = iface.alternates[0];
      const outEndpoint = alternate.endpoints.find((e: any) => e.direction === 'out');
      if (outEndpoint) {
        this.endpointNumber = outEndpoint.endpointNumber;
      }

      return true;
    } catch (err: any) {
      console.warn('[AKEH-HMS] WebUSB Connection warning:', err);
      throw err;
    }
  }

  public isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }

  public async print(data: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
    if (!this.device) {
      throw new Error('No USB printer device connected');
    }
    await this.device.transferOut(this.endpointNumber, data);
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      await this.device.close();
      this.device = null;
    }
  }
}
