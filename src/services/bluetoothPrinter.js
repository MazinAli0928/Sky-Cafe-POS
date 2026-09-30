/**
 * Bluetooth Thermal Printer Service for Cafe POS
 * Supports ESC/POS binary protocol over Web Bluetooth API (navigator.bluetooth)
 * Compatible with 58mm (32 chars/line) and 80mm (48 chars/line) Bluetooth thermal printers
 * (e.g., POS-58, POS-80, PT-210, MTP-2, RPP02N, GOOJPRT, etc.)
 */

// Module-level Bluetooth state
let bluetoothDevice = null;
let bluetoothCharacteristic = null;
let connectedDeviceName = localStorage.getItem("cafe_pos_bt_printer_name") || null;

/**
 * Check if Web Bluetooth API is supported by browser (Chrome, Edge, Brave, Android Chrome)
 */
export const isWebBluetoothSupported = () => {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
};

/**
 * Get current Bluetooth printer connection state
 */
export const getBluetoothPrinterStatus = () => {
  if (bluetoothCharacteristic && bluetoothDevice?.gatt?.connected) {
    return {
      connected: true,
      deviceName: bluetoothDevice.name || connectedDeviceName || "Bluetooth Printer",
      status: "Connected"
    };
  }
  return {
    connected: false,
    deviceName: connectedDeviceName,
    status: connectedDeviceName ? "Saved (Disconnected)" : "Not Paired"
  };
};

/**
 * Request & Pair Bluetooth Thermal Printer
 */
export const connectBluetoothPrinter = async () => {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge."
    );
  }

  try {
    // Standard Bluetooth Thermal Printer & Serial Service UUIDs
    const optionalServices = [
      "000018f0-0000-1000-8000-00805f9b34fb", // Common Bluetooth Printer
      "00001101-0000-1000-8000-00805f9b34fb", // Serial Port Profile (SPP)
      "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 / Generic Serial
      "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "0000ff00-0000-1000-8000-00805f9b34fb"
    ];

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: optionalServices
    });

    if (!device) throw new Error("No Bluetooth device selected.");

    const server = await device.gatt.connect();

    // Find printable characteristic
    let targetCharacteristic = null;
    const services = await server.getPrimaryServices();

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          targetCharacteristic = char;
          break;
        }
      }
      if (targetCharacteristic) break;
    }

    if (!targetCharacteristic) {
      throw new Error(
        `Connected to "${device.name}", but could not find a writable print characteristic.`
      );
    }

    bluetoothDevice = device;
    bluetoothCharacteristic = targetCharacteristic;
    connectedDeviceName = device.name || "Bluetooth Thermal Printer";
    localStorage.setItem("cafe_pos_bt_printer_name", connectedDeviceName);

    // Listen for disconnect
    device.addEventListener("gattserverdisconnected", () => {
      bluetoothCharacteristic = null;
    });

    return {
      connected: true,
      deviceName: connectedDeviceName
    };
  } catch (error) {
    if (error.name === "NotFoundError") {
      throw new Error("Bluetooth pairing cancelled.");
    }
    throw error;
  }
};

/**
 * Disconnect current Bluetooth printer
 */
export const disconnectBluetoothPrinter = () => {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  bluetoothCharacteristic = null;
  connectedDeviceName = null;
  localStorage.removeItem("cafe_pos_bt_printer_name");
};

/**
 * Format string with padding for thermal receipt columns
 */
const formatLine = (left, right, maxLen) => {
  const leftStr = String(left);
  const rightStr = String(right);
  const spaces = Math.max(1, maxLen - leftStr.length - rightStr.length);
  return leftStr + " ".repeat(spaces) + rightStr;
};

/**
 * Build ESC/POS Command Stream for Receipt
 */
export const buildEscPosCommands = (order, settings) => {
  const paperWidth = settings?.receipt?.paperWidth || "80mm";
  const maxLen = paperWidth === "58mm" ? 32 : 48; // 32 chars for 58mm, 48 chars for 80mm

  const cafeName = settings?.cafeInfo?.name || "SKY CAFE";
  const address = settings?.cafeInfo?.address || "Mysore, Karnataka";
  const phone = settings?.cafeInfo?.phone || "+91 98765 43210";
  const gstin = settings?.cafeInfo?.gstin || "";
  const footerMessage = settings?.receipt?.footerMessage || "THANK YOU! VISIT AGAIN.";

  const billNo = order?.billNo || order?.bill_no || "1024";
  const date = order?.date || new Date().toLocaleDateString("en-IN");
  const time = order?.time || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const items = order?.items || [];

  const subtotal = order?.subtotal ?? items.reduce((a, i) => a + (i.total || i.price * i.quantity), 0);
  const discountAmount = order?.discountAmount ?? order?.discount ?? 0;
  const tax = order?.tax ?? 0;
  const total = order?.total ?? (subtotal - discountAmount + tax);
  const paymentMethod = (order?.paymentMethod || "UPI").toUpperCase();

  const encoder = new TextEncoder();
  const parts = [];

  // Helper bytes
  const ESC = 0x1b;
  const GS = 0x1d;

  // 1. Initialize printer
  parts.push(new Uint8Array([ESC, 0x40]));

  // 2. Center Align Header
  parts.push(new Uint8Array([ESC, 0x61, 0x01])); // Center

  // Double height + width for Cafe Name
  parts.push(new Uint8Array([GS, 0x21, 0x11]));
  parts.push(encoder.encode(`${cafeName}\n`));
  parts.push(new Uint8Array([GS, 0x21, 0x00])); // Normal size

  if (settings?.receipt?.showAddress && address) {
    parts.push(encoder.encode(`${address}\n`));
  }
  if (settings?.receipt?.showPhone && phone) {
    parts.push(encoder.encode(`Ph: ${phone}\n`));
  }
  if (settings?.receipt?.showGst && gstin) {
    parts.push(encoder.encode(`GSTIN: ${gstin}\n`));
  }

  // 3. Separator
  parts.push(encoder.encode("-".repeat(maxLen) + "\n"));

  // 4. Left Align Bill Info
  parts.push(new Uint8Array([ESC, 0x61, 0x00])); // Left
  parts.push(encoder.encode(formatLine(`Bill No: #${billNo}`, `Date: ${date}`, maxLen) + "\n"));
  parts.push(encoder.encode(formatLine(`Payment: ${paymentMethod}`, `Time: ${time}`, maxLen) + "\n"));

  // Cashier info if present
  if (order?.cashierName) {
    parts.push(encoder.encode(`Cashier: ${order.cashierName}\n`));
  }

  // 5. Separator
  parts.push(encoder.encode("-".repeat(maxLen) + "\n"));

  // 6. Items Table
  if (maxLen === 32) {
    // 58mm Header: ITEM (14) QTY (4) AMT (12)
    parts.push(encoder.encode("ITEM            QTY       AMOUNT\n"));
    parts.push(encoder.encode("-".repeat(maxLen) + "\n"));

    items.forEach((item) => {
      const name = String(item.name).slice(0, 15);
      const qty = String(item.quantity).padStart(3, " ");
      const amt = `Rs.${item.total || item.price * item.quantity}`.padStart(10, " ");
      parts.push(encoder.encode(`${name.padEnd(15, " ")} ${qty} ${amt}\n`));
    });
  } else {
    // 80mm Header: ITEM (24) QTY (6) PRICE (8) AMT (10)
    parts.push(encoder.encode("ITEM                     QTY    PRICE     AMOUNT\n"));
    parts.push(encoder.encode("-".repeat(maxLen) + "\n"));

    items.forEach((item) => {
      const name = String(item.name).slice(0, 23).padEnd(24, " ");
      const qty = String(item.quantity).padStart(5, " ");
      const price = `Rs.${item.price || item.unit_price}`.padStart(8, " ");
      const amt = `Rs.${item.total || item.price * item.quantity}`.padStart(10, " ");
      parts.push(encoder.encode(`${name} ${qty} ${price} ${amt}\n`));
    });
  }

  // 7. Separator
  parts.push(encoder.encode("-".repeat(maxLen) + "\n"));

  // 8. Totals Breakdown
  parts.push(encoder.encode(formatLine("Subtotal:", `Rs.${subtotal}`, maxLen) + "\n"));

  if (discountAmount > 0) {
    const discLabel = order?.discountType === "percentage" ? `Discount (${order.discountValue}%):` : "Discount:";
    parts.push(encoder.encode(formatLine(discLabel, `-Rs.${discountAmount}`, maxLen) + "\n"));
  }

  if (tax > 0) {
    parts.push(encoder.encode(formatLine("Tax:", `Rs.${tax}`, maxLen) + "\n"));
  }

  parts.push(encoder.encode("-".repeat(maxLen) + "\n"));

  // Double Height for TOTAL
  parts.push(new Uint8Array([ESC, 0x45, 0x01])); // Bold ON
  parts.push(encoder.encode(formatLine("TOTAL PAID:", `Rs.${total}`, maxLen) + "\n"));
  parts.push(new Uint8Array([ESC, 0x45, 0x00])); // Bold OFF

  parts.push(encoder.encode("-".repeat(maxLen) + "\n"));

  // 9. Footer Message (Centered)
  parts.push(new Uint8Array([ESC, 0x61, 0x01])); // Center
  parts.push(encoder.encode(`${footerMessage}\n\n`));

  // 10. Feed 3 lines & Cut Paper
  parts.push(new Uint8Array([ESC, 0x64, 0x03]));
  parts.push(new Uint8Array([GS, 0x56, 0x00])); // Full Cut

  // Combine Uint8Arrays
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
};

/**
 * Send print bytes directly to Bluetooth Thermal Printer
 */
export const printViaBluetooth = async (order, settings) => {
  if (!bluetoothCharacteristic || !bluetoothDevice?.gatt?.connected) {
    // Attempt auto-reconnect if device saved
    try {
      await connectBluetoothPrinter();
    } catch {
      throw new Error("Bluetooth printer is not connected. Please pair your Bluetooth printer in Settings.");
    }
  }

  const dataBytes = buildEscPosCommands(order, settings);

  // Send data in chunks (BLE characteristic max payload size is usually 100-512 bytes)
  const chunkSize = 100;
  for (let i = 0; i < dataBytes.length; i += chunkSize) {
    const chunk = dataBytes.slice(i, i + chunkSize);
    if (bluetoothCharacteristic.properties.writeWithoutResponse) {
      await bluetoothCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await bluetoothCharacteristic.writeValue(chunk);
    }
    // Small delay between BLE packets
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return true;
};

/**
 * Fallback: Browser Print for Bluetooth Printers paired as Windows Drivers or Standard Printers
 */
export const printViaBrowserFallback = (order, settings) => {
  const paperWidth = settings?.receipt?.paperWidth || "80mm";
  const widthPx = paperWidth === "58mm" ? "240px" : "320px";

  const cafeName = settings?.cafeInfo?.name || "SKY CAFE";
  const address = settings?.cafeInfo?.address || "Mysore, Karnataka";
  const phone = settings?.cafeInfo?.phone || "+91 98765 43210";
  const gstin = settings?.cafeInfo?.gstin || "";
  const footerMessage = settings?.receipt?.footerMessage || "THANK YOU! VISIT AGAIN.";

  const billNo = order?.billNo || order?.bill_no || "1024";
  const date = order?.date || new Date().toLocaleDateString("en-IN");
  const time = order?.time || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const items = order?.items || [];

  const subtotal = order?.subtotal ?? items.reduce((a, i) => a + (i.total || i.price * i.quantity), 0);
  const discountAmount = order?.discountAmount ?? order?.discount ?? 0;
  const tax = order?.tax ?? 0;
  const total = order?.total ?? (subtotal - discountAmount + tax);
  const paymentMethod = (order?.paymentMethod || "UPI").toUpperCase();

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    window.print();
    return;
  }

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="text-align:left; padding:2px 0;">${item.name}</td>
      <td style="text-align:center; padding:2px 0;">${item.quantity}</td>
      <td style="text-align:right; padding:2px 0;">₹${item.price || item.unit_price}</td>
      <td style="text-align:right; padding:2px 0; font-weight:bold;">₹${item.total || item.price * item.quantity}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt #${billNo}</title>
        <style>
          @page { size: ${paperWidth} auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${widthPx};
            margin: 0 auto;
            padding: 10px;
            color: #000;
            background: #fff;
            font-size: 11px;
            line-height: 1.2;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 3px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size:16px; font-weight:bold;">${cafeName}</div>
          ${settings?.receipt?.showLogo ? `<img src="/logo.png" style="height:45px; margin:4px 0;" />` : ""}
          ${address ? `<div>${address}</div>` : ""}
          ${phone ? `<div>Ph: ${phone}</div>` : ""}
          ${gstin ? `<div>GSTIN: ${gstin}</div>` : ""}
        </div>
        <div class="border-b"></div>
        <div style="display:flex; justify-content:space-between;">
          <span>Bill No: #${billNo}</span>
          <span>Date: ${date}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Pay: ${paymentMethod}</span>
          <span>Time: ${time}</span>
        </div>
        <div class="border-b"></div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">ITEM</th>
              <th style="text-align:center;">QTY</th>
              <th style="text-align:right;">PRICE</th>
              <th style="text-align:right;">AMT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="border-b"></div>
        <div style="display:flex; justify-content:space-between;">
          <span>Subtotal</span>
          <span>₹${subtotal}</span>
        </div>
        ${
          discountAmount > 0
            ? `<div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>Discount</span>
                <span>-₹${discountAmount}</span>
              </div>`
            : ""
        }
        ${
          tax > 0
            ? `<div style="display:flex; justify-content:space-between;">
                <span>Tax</span>
                <span>₹${tax}</span>
              </div>`
            : ""
        }
        <div class="border-b"></div>
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold;">
          <span>TOTAL PAID</span>
          <span>₹${total}</span>
        </div>
        <div class="border-b"></div>
        <div class="text-center" style="margin-top:10px; font-size:10px;">
          ${footerMessage}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Universal Thermal Print Handler:
 * First attempts Web Bluetooth ESC/POS if connected.
 * If Bluetooth is not paired, falls back to thermal-formatted window printing.
 */
export const printThermalReceipt = async (order, settings) => {
  const btStatus = getBluetoothPrinterStatus();

  if (btStatus.connected) {
    try {
      await printViaBluetooth(order, settings);
      return { method: "bluetooth", success: true };
    } catch (err) {
      console.warn("Bluetooth print failed, falling back to browser thermal print:", err);
    }
  }

  // Fallback to thermal browser print
  printViaBrowserFallback(order, settings);
  return { method: "browser", success: true };
};
