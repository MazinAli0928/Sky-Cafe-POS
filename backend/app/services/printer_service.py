"""
Thermal Printer Service — Portable ESC/POS over Bluetooth SPP
Printer: CIE-DYNO-2F64 (or generic SPP thermal printer)
Supports Windows auto-discovery across different COM ports (COM3, COM5, COM8, COM11, etc.)
"""
import os
import struct
import logging
import subprocess
from datetime import datetime
from typing import Optional, List, Union, Dict, Any

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

logger = logging.getLogger(__name__)

# ─── ESC/POS Command Constants ──────────────────────────────────────────────
ESC = b'\x1b'
GS  = b'\x1d'

CMD_INIT        = ESC + b'\x40'          # Initialize printer
CMD_BOLD_ON     = ESC + b'\x45\x01'
CMD_BOLD_OFF    = ESC + b'\x45\x00'
CMD_ALIGN_LEFT  = ESC + b'\x61\x00'
CMD_ALIGN_CENTER= ESC + b'\x61\x01'
CMD_ALIGN_RIGHT = ESC + b'\x61\x02'
CMD_DOUBLE_SIZE = GS  + b'\x21\x11'      # Double width + height
CMD_NORMAL_SIZE = GS  + b'\x21\x00'
CMD_LF          = b'\x0a'               # Line feed
CMD_FEED3       = ESC + b'\x64\x03'     # Feed 3 lines
CMD_FEED5       = ESC + b'\x64\x05'     # Feed 5 lines
CMD_FULL_CUT    = GS  + b'\x56\x00'     # Full paper cut
CMD_PARTIAL_CUT = GS  + b'\x56\x01'    # Partial cut

# Logo absolute path (relative to backend/app/services/)
_HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "public", "logo.png"))


# ─── Reusable Formatting Utilities ──────────────────────────────────────────

def wrapText(text: str, width: int) -> List[str]:
    """
    Wraps text cleanly into lines of at most `width` characters.
    Never splits words unless a word itself exceeds `width`.
    """
    if not text:
        return [""]
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        if len(word) > width:
            if current_line:
                lines.append(current_line)
                current_line = ""
            for i in range(0, len(word), width):
                chunk = word[i:i + width]
                if len(chunk) == width:
                    lines.append(chunk)
                else:
                    current_line = chunk
        elif not current_line:
            current_line = word
        elif len(current_line) + 1 + len(word) <= width:
            current_line += " " + word
        else:
            lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines or [""]


def formatItemRow(name: str, qty: Union[int, str], amount: Union[float, int, str], width: int = 32) -> List[str]:
    """
    Formats an item row into fixed-width printable lines for ESC/POS:
    - Item column: Left aligned
    - Qty column: Centered (6 chars)
    - Amount column: Right aligned (10 chars for width=32, 14 chars for width=48)
    - Uses 'Rs.' prefix (never unicode ₹)
    - Calculates padding dynamically without hardcoded space counts
    - Wraps long item names cleanly without distorting Qty/Amount alignment
    """
    if width <= 32:
        qty_width = 6
        amount_width = 10
    else:
        qty_width = 6
        amount_width = 14
    item_width = max(10, width - qty_width - amount_width)

    # Format Qty
    if isinstance(qty, int) or (isinstance(qty, str) and qty.strip().isdigit()):
        qty_str = f"{int(str(qty).strip()):^6}"
    else:
        qty_str = f"{str(qty).strip():^6}"

    # Format Amount (Printer-safe 'Rs.')
    if isinstance(amount, (int, float)):
        amt_val = float(amount)
        if amt_val.is_integer():
            amt_text = f"Rs.{int(amt_val)}"
        else:
            amt_text = f"Rs.{amt_val:.2f}"
    else:
        amt_text = str(amount).replace("₹", "Rs.")

    amt_formatted = f"{amt_text:>{amount_width}}"

    # Wrap product name
    name_lines = wrapText(name, item_width)
    output_lines = []

    # First line has Item Name part 1 + Qty + Amount
    first_item = f"{name_lines[0]:<{item_width}}"
    output_lines.append(f"{first_item}{qty_str}{amt_formatted}")

    # Subsequent lines (if long name wrapped) have extra item name + blank columns
    blank_right = " " * (qty_width + amount_width)
    for extra_name in name_lines[1:]:
        extra_item = f"{extra_name:<{item_width}}"
        output_lines.append(f"{extra_item}{blank_right}")

    return output_lines


def formatTotalRow(label: str, amount: Union[float, int, str], width: int = 32) -> str:
    """
    Formats a totals row (e.g. Subtotal, Discount, Tax, TOTAL):
    - Label: Left aligned
    - Amount: Right aligned (prefixed with printer-safe 'Rs.')
    """
    if isinstance(amount, (int, float)):
        amt_val = float(amount)
        if amt_val.is_integer():
            amt_text = f"Rs.{int(amt_val)}"
        else:
            amt_text = f"Rs.{amt_val:.2f}"
    else:
        amt_text = str(amount).replace("₹", "Rs.")

    max_label_w = width - len(amt_text) - 1
    if max_label_w < 1:
        max_label_w = 1
    label_part = label[:max_label_w]
    gap = width - len(label_part) - len(amt_text)
    if gap < 1:
        gap = 1
    return label_part + (" " * gap) + amt_text


# ─── Windows Bluetooth Auto-Discovery Engine ─────────────────────────────────

def auto_detect_printer_port(target_name: str = "CIE-DYNO-2F64") -> Dict[str, Any]:
    """
    Discovers Windows Bluetooth SPP thermal printers automatically.
    Searches system COM ports via pyserial and Windows PnP.
    Does NOT hardcode any COM port.
    Returns dict with discovery result and list of all available COM ports.
    """
    if not SERIAL_AVAILABLE:
        return {
            "found": False,
            "port": None,
            "device_name": target_name,
            "available_ports": [],
            "message": "pyserial module is not installed."
        }

    available_ports = []
    candidates = []
    target_names = [target_name, "CIE-DYNO", "2F64", "POS-58", "POS-80", "PT-210", "MTP-2"]

    for p in serial.tools.list_ports.comports():
        port = p.device
        hwid = p.hwid or ""
        desc = p.description or ""
        is_bt = "BTHENUM" in hwid or "Bluetooth" in desc

        available_ports.append({
            "port": port,
            "description": desc,
            "hwid": hwid,
            "is_bluetooth": is_bt
        })

        score = 0
        matched_name = None

        if "2F64" in hwid or "2F64" in desc or target_name.lower() in hwid.lower() or target_name.lower() in desc.lower():
            score += 100
            matched_name = target_name
        else:
            for t in target_names:
                if t.lower() in hwid.lower() or t.lower() in desc.lower():
                    score += 20
                    matched_name = t
                    break

        if is_bt:
            score += 10
            if not matched_name:
                matched_name = desc

        if is_bt or score > 0:
            candidates.append({
                "port": port,
                "device_name": matched_name or desc,
                "score": score
            })

    candidates.sort(key=lambda x: x["score"], reverse=True)

    if candidates:
        best = candidates[0]
        return {
            "found": True,
            "port": best["port"],
            "device_name": best["device_name"],
            "available_ports": available_ports,
            "message": f"Discovered Bluetooth printer '{best['device_name']}' on {best['port']}."
        }
    elif available_ports:
        return {
            "found": False,
            "port": None,
            "device_name": target_name,
            "available_ports": available_ports,
            "message": "No Bluetooth thermal printer auto-detected. Select port manually."
        }
    else:
        return {
            "found": False,
            "port": None,
            "device_name": target_name,
            "available_ports": [],
            "message": "No serial COM ports found on this system."
        }


def get_available_com_ports() -> List[Dict[str, Any]]:
    """Returns list of all active serial COM ports on Windows."""
    if not SERIAL_AVAILABLE:
        return []
    ports = []
    for p in serial.tools.list_ports.comports():
        ports.append({
            "port": p.device,
            "description": p.description,
            "hwid": p.hwid,
            "is_bluetooth": "BTHENUM" in (p.hwid or "") or "Bluetooth" in (p.description or "")
        })
    return ports


# ─── Main Printer Service Class ─────────────────────────────────────────────

class PrinterService:
    """
    Portable ESC/POS printer service.
    Opens COM port only during print, always closes in finally.
    Dynamically discovers Bluetooth SPP port across different computers.
    """

    def __init__(
        self,
        port: str = "AUTO",
        baudrate: int = 9600,
        paper_width: str = "80mm",
        auto_cut: bool = True,
        printer_name: str = "CIE-DYNO-2F64",
        enabled: bool = True,
        encoding: str = "cp437",
        timeout: float = 5.0,
    ):
        self.configured_port = port
        self.port = port
        self.baudrate = baudrate
        self.paper_width = paper_width
        self.auto_cut = auto_cut
        self.printer_name = printer_name
        self.enabled = enabled
        self.encoding = encoding
        self.timeout = timeout

    def resolve_port(self) -> str:
        """
        Resolves active COM port for printing.
        If configured port is 'AUTO' or missing on system, runs auto-discovery.
        """
        if not SERIAL_AVAILABLE:
            return self.configured_port if self.configured_port != "AUTO" else "COM1"

        available_ports = [p.device for p in serial.tools.list_ports.comports()]

        # 1. If configured port exists on system and is not AUTO, use it
        if self.configured_port and self.configured_port != "AUTO" and self.configured_port in available_ports:
            self.port = self.configured_port
            return self.configured_port

        # 2. Attempt automatic discovery
        discovery = auto_detect_printer_port(self.printer_name)
        if discovery["found"] and discovery["port"]:
            self.port = discovery["port"]
            return discovery["port"]

        # 3. Fallback to configured port if set, or first available port
        if self.configured_port and self.configured_port != "AUTO":
            self.port = self.configured_port
            return self.configured_port

        fallback = available_ports[0] if available_ports else "COM1"
        self.port = fallback
        return fallback

    @property
    def _chars_per_line(self) -> int:
        """
        Exact printable character width for thermal printing.
        Standard for thermal receipts is 32 characters per line.
        """
        if self.paper_width == "80mm_wide":
            return 48
        return 32

    def _text(self, s: str) -> bytes:
        """Encode string into printer bytes safely (replaces unmappable characters with ?)."""
        safe_str = s.replace("₹", "Rs.")
        return safe_str.encode(self.encoding, errors="replace")

    def _separator(self, char: str = "-", width: Optional[int] = None) -> str:
        return char * (width or self._chars_per_line)

    def _open(self) -> "serial.Serial":
        """Open serial port using resolved COM port. Always closes in finally."""
        if not SERIAL_AVAILABLE:
            raise RuntimeError("pyserial is not installed. Run: pip install pyserial")

        target_port = self.resolve_port()

        return serial.Serial(
            port=target_port,
            baudrate=self.baudrate,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=self.timeout,
            write_timeout=self.timeout,
        )

    # ─── Logo Conversion ───────────────────────────────────────────────────

    def _build_logo_bytes(self, max_width_px: int = 180) -> Optional[bytes]:
        """Convert logo.png to ESC/POS GS v 0 raster bitmap bytes."""
        if not PIL_AVAILABLE:
            logger.warning("Pillow not installed — logo skipped.")
            return None
        if not os.path.isfile(LOGO_PATH):
            logger.warning("Logo file not found at %s — logo skipped.", LOGO_PATH)
            return None

        try:
            img = Image.open(LOGO_PATH).convert("RGBA")
            bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img = bg.convert("L")

            aspect = img.height / img.width
            new_w = min(max_width_px, img.width)
            new_h = max(1, int(new_w * aspect))
            img = img.resize((new_w, new_h), Image.LANCZOS)

            img = img.point(lambda p: 0 if p < 180 else 255, "1")

            pad_w = ((img.width + 7) // 8) * 8
            if pad_w != img.width:
                padded = Image.new("1", (pad_w, img.height), 1)
                padded.paste(img, (0, 0))
                img = padded

            width_bytes = img.width // 8
            height_px   = img.height

            header = (
                GS + b'\x76\x30\x00'
                + struct.pack("<H", width_bytes)
                + struct.pack("<H", height_px)
            )

            pixel_data = bytearray()
            for y in range(height_px):
                row_byte = 0
                bit = 7
                for x in range(img.width):
                    pixel = img.getpixel((x, y))
                    if pixel == 0:
                        row_byte |= (1 << bit)
                    bit -= 1
                    if bit < 0:
                        pixel_data.append(row_byte)
                        row_byte = 0
                        bit = 7
                if bit != 7:
                    pixel_data.append(row_byte)

            return header + bytes(pixel_data)
        except Exception as exc:
            logger.warning("Logo conversion failed: %s", exc)
            return None

    # ─── Receipt Builder ───────────────────────────────────────────────────

    def _build_receipt(self, order: dict, settings: dict) -> bytes:
        """Build full ESC/POS byte stream for thermal receipt."""
        buf = bytearray()
        w   = self._chars_per_line

        buf += CMD_INIT

        # 1. LOGO
        if settings.get("show_logo", True):
            logo_bytes = self._build_logo_bytes(max_width_px=180)
            if logo_bytes:
                buf += CMD_ALIGN_CENTER
                buf += logo_bytes
                buf += CMD_LF

        # 2. HEADER
        cafe_name = settings.get("cafe_name", "SKY CAFE")
        tagline   = settings.get("tagline", "")
        address   = settings.get("address", "")
        phone     = settings.get("phone", "")

        buf += CMD_ALIGN_CENTER
        buf += CMD_DOUBLE_SIZE + CMD_BOLD_ON
        buf += self._text(cafe_name.upper()) + CMD_LF
        buf += CMD_NORMAL_SIZE + CMD_BOLD_OFF

        if tagline:
            buf += self._text(tagline) + CMD_LF
        if settings.get("show_address", True) and address:
            buf += self._text(address) + CMD_LF
        if settings.get("show_phone", True) and phone:
            buf += self._text(phone) + CMD_LF

        buf += CMD_LF
        buf += CMD_ALIGN_LEFT

        # 3. BILL INFO
        buf += self._text(self._separator("-", w)) + CMD_LF

        bill_no    = order.get("bill_no") or order.get("billNo") or "1071"
        created_at = order.get("created_at", "")
        cashier    = order.get("cashier_name") or order.get("cashierName") or "Cashier"
        payment    = order.get("payment_method") or order.get("paymentMethod") or "UPI"

        date_str = datetime.now().strftime("%d/%m/%Y")
        time_str = datetime.now().strftime("%I:%M %p")

        if created_at:
            try:
                dt = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
                date_str = dt.strftime("%d/%m/%Y")
                time_str = dt.strftime("%I:%M %p")
            except Exception:
                pass

        buf += self._text(f"Bill No: #{bill_no}") + CMD_LF
        buf += self._text(f"Date: {date_str}") + CMD_LF
        buf += self._text(f"Time: {time_str}") + CMD_LF
        buf += self._text(f"Cashier: {cashier}") + CMD_LF
        buf += self._text(f"Payment: {payment}") + CMD_LF

        # 4. ITEMS TABLE
        buf += self._text(self._separator("-", w)) + CMD_LF

        header_lines = formatItemRow("Item", "Qty", "Amount", w)
        for h_line in header_lines:
            buf += CMD_BOLD_ON + self._text(h_line) + CMD_BOLD_OFF + CMD_LF

        buf += self._text(self._separator("-", w)) + CMD_LF

        items = order.get("items") or []
        for item in items:
            name  = str(item.get("product_name") or item.get("name") or "Item")
            qty   = item.get("quantity", 1)
            total = float(item.get("total_price") or item.get("total") or 0)
            
            row_lines = formatItemRow(name, qty, total, w)
            for r_line in row_lines:
                buf += self._text(r_line) + CMD_LF

        # 5. TOTALS
        buf += self._text(self._separator("-", w)) + CMD_LF

        subtotal        = float(order.get("subtotal", 0))
        discount_amount = float(order.get("discount_amount") or order.get("discountAmount") or order.get("discount") or 0)
        tax             = float(order.get("tax", 0))
        total           = float(order.get("total", 0))

        buf += self._text(formatTotalRow("Subtotal", subtotal, w)) + CMD_LF
        buf += self._text(formatTotalRow("Discount", discount_amount, w)) + CMD_LF
        buf += self._text(formatTotalRow("Tax", tax, w)) + CMD_LF

        buf += self._text(self._separator("-", w)) + CMD_LF

        # TOTAL (Bold)
        buf += CMD_BOLD_ON
        buf += self._text(formatTotalRow("TOTAL", total, w)) + CMD_LF
        buf += CMD_BOLD_OFF

        buf += self._text(self._separator("-", w)) + CMD_LF

        if settings.get("show_gst", True) and settings.get("gstin"):
            buf += CMD_LF
            buf += CMD_ALIGN_CENTER
            buf += self._text(f"GSTIN: {settings['gstin']}") + CMD_LF
            buf += CMD_ALIGN_LEFT

        # 6. FOOTER
        footer = settings.get("footer_message", "Thank You!")
        buf += CMD_LF
        buf += CMD_ALIGN_CENTER
        buf += self._text(footer) + CMD_LF
        buf += CMD_ALIGN_LEFT

        buf += CMD_FEED3

        if self.auto_cut:
            buf += CMD_FULL_CUT

        return bytes(buf)

    def _build_test_receipt(self) -> bytes:
        """Build test pattern receipt with Chicken Cuts and Chicken Strips."""
        w = self._chars_per_line
        test_order = {
            "bill_no": "1071",
            "created_at": datetime.now().isoformat(),
            "cashier_name": "Manager",
            "payment_method": "UPI",
            "items": [
                {"product_name": "Chicken Cuts", "quantity": 1, "total_price": 149},
                {"product_name": "Chicken Strips", "quantity": 1, "total_price": 149}
            ],
            "subtotal": 298,
            "discount_amount": 0,
            "tax": 0,
            "total": 298
        }
        test_settings = {
            "show_logo": True,
            "cafe_name": "SKY CAFE",
            "tagline": "FOOD ABOVE ORDINARY",
            "address": "MYSORE",
            "phone": "+91 98765 43210",
            "show_address": True,
            "show_phone": True,
            "footer_message": "Thank You!"
        }
        return self._build_receipt(test_order, test_settings)

    # ─── Public API ──────────────────────────────────────────────────────────

    def get_status(self) -> dict:
        """Check printer status dynamically using resolved port."""
        if not SERIAL_AVAILABLE:
            return {
                "connected": False,
                "port": self.configured_port,
                "printer_name": self.printer_name,
                "connection_type": "bluetooth_spp",
                "message": "pyserial not installed.",
                "available_ports": []
            }

        target_port = self.resolve_port()
        available_ports = get_available_com_ports()
        port_names = [p["port"] for p in available_ports]

        if target_port in port_names:
            return {
                "connected": True,
                "port": target_port,
                "printer_name": self.printer_name,
                "connection_type": "bluetooth_spp",
                "baud_rate": self.baudrate,
                "paper_width": self.paper_width,
                "auto_cut": self.auto_cut,
                "message": f"Connected to {self.printer_name} on {target_port} (Bluetooth SPP).",
                "available_ports": available_ports
            }
        else:
            return {
                "connected": False,
                "port": target_port,
                "printer_name": self.printer_name,
                "connection_type": "bluetooth_spp",
                "baud_rate": self.baudrate,
                "paper_width": self.paper_width,
                "auto_cut": self.auto_cut,
                "message": f"Printer disconnected or port {target_port} not found on this computer.",
                "available_ports": available_ports
            }

    def test_print(self, settings: dict = None) -> dict:
        """Send test pattern receipt using resolved port."""
        ser = None
        target_port = self.resolve_port()
        try:
            ser = self._open()
            data = self._build_test_receipt()
            ser.write(data)
            ser.flush()
            return {"success": True, "message": f"Test print sent to {target_port} ({self.printer_name})"}
        except FileNotFoundError:
            return {"success": False, "message": f"Port {target_port} not found. Is the Bluetooth printer paired?"}
        except PermissionError:
            return {"success": False, "message": f"Port {target_port} is in use by another process."}
        except serial.SerialException as exc:
            return {"success": False, "message": f"Serial error on {target_port}: {exc}"}
        except Exception as exc:
            logger.exception("Unexpected error during test print")
            return {"success": False, "message": f"Printer error: {exc}"}
        finally:
            if ser and ser.is_open:
                try:
                    ser.close()
                except Exception:
                    pass

    def print_receipt(self, order: dict, settings: dict) -> dict:
        """Print full receipt for order dict. Never throws."""
        ser = None
        bill_no = order.get("bill_no") or order.get("billNo") or "?"
        target_port = self.resolve_port()
        try:
            ser = self._open()
            data = self._build_receipt(order, settings)
            ser.write(data)
            ser.flush()
            return {"success": True, "message": f"Receipt for Bill #{bill_no} printed on {target_port}"}
        except FileNotFoundError:
            return {"success": False, "message": f"Port {target_port} not found. Is Bluetooth printer connected?"}
        except PermissionError:
            return {"success": False, "message": f"Port {target_port} is in use by another application."}
        except serial.SerialException as exc:
            return {"success": False, "message": f"Serial communication error on {target_port}: {exc}"}
        except Exception as exc:
            logger.exception("Unexpected error while printing receipt for Bill #%s", bill_no)
            return {"success": False, "message": f"Print error: {exc}"}
        finally:
            if ser and ser.is_open:
                try:
                    ser.close()
                except Exception:
                    pass


def get_printer_service(settings: dict = None) -> PrinterService:
    s = settings or {}
    return PrinterService(
        port            = s.get("printer_port") or "AUTO",
        baudrate        = int(s.get("printer_baudrate", 9600)),
        paper_width     = s.get("receipt_paper_width", "80mm"),
        auto_cut        = bool(s.get("printer_auto_cut", True)),
        printer_name    = s.get("printer_name", "CIE-DYNO-2F64"),
        enabled         = bool(s.get("printer_enabled", True))
    )
