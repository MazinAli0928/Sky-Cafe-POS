import React, { useState, useEffect, useCallback } from "react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ReceiptPreview from "../components/common/ReceiptPreview";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { createBackup, listBackups, getPrinterStatus, testPrinter, detectPrinter, getComPorts } from "../services/api";
import {
  isWebBluetoothSupported,
  getBluetoothPrinterStatus,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  printThermalReceipt
} from "../services/bluetoothPrinter";
import {
  Save, Printer, Building2, FileText, Briefcase, RefreshCw,
  Database, Download, ShieldCheck, HardDrive, CheckCircle2, Clock,
  Bluetooth, Unplug, AlertCircle, Cpu, Check, Search
} from "lucide-react";

const SettingsPage = () => {
  const {
    settings,
    loading,
    error,
    refreshSettings,
    updateCafeInfo,
    updateReceiptSettings,
    updatePrinterSettings,
    updateBusinessSettings
  } = useSettings();
  const { isManager, token } = useAuth();
  const { addToast } = useToast();

  const [cafeForm, setCafeForm] = useState(settings.cafeInfo);
  const [receiptForm, setReceiptForm] = useState(settings.receipt);
  const [printerForm, setPrinterForm] = useState(settings.printer);
  const [businessForm, setBusinessForm] = useState(settings.business);
  const [saving, setSaving] = useState(false);

  // Hardware Portable Printer state
  const [hwPrinterStatus, setHwPrinterStatus] = useState({ connected: false, port: "AUTO", message: "Checking printer status..." });
  const [isTestingHwPrinter, setIsTestingHwPrinter] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [availablePorts, setAvailablePorts] = useState([]);

  // Bluetooth Printer state
  const [btStatus, setBtStatus] = useState(getBluetoothPrinterStatus());
  const [isPairingBt, setIsPairingBt] = useState(false);

  // Backup states
  const [backups, setBackups] = useState([]);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const checkHwPrinterStatus = useCallback(async () => {
    try {
      const res = await getPrinterStatus();
      setHwPrinterStatus(res);
      if (res.available_ports) {
        setAvailablePorts(res.available_ports);
      }
    } catch (err) {
      setHwPrinterStatus({ connected: false, port: printerForm.port || "AUTO", message: err.message });
    }
  }, [printerForm.port]);

  const fetchComPorts = useCallback(async () => {
    try {
      const ports = await getComPorts();
      setAvailablePorts(ports);
    } catch {
      // Ignore background error
    }
  }, []);

  const handleDetectPrinter = async () => {
    setIsDetecting(true);
    try {
      const res = await detectPrinter();
      if (res.found) {
        addToast(`Discovered ${res.device_name} on ${res.port}!`, "success");
        setPrinterForm((prev) => ({ ...prev, port: res.port }));
      } else {
        addToast(res.message || "Printer not auto-detected. Select port manually.", "warning");
      }
      checkHwPrinterStatus();
    } catch (err) {
      addToast(`Detection failed: ${err.message}`, "error");
    } finally {
      setIsDetecting(false);
    }
  };

  const fetchBackupList = useCallback(async () => {
    if (!isManager) return;
    try {
      const data = await listBackups(token);
      setBackups(data);
    } catch {
      // Ignore background backup list fetch error
    }
  }, [isManager, token]);

  useEffect(() => {
    setCafeForm(settings.cafeInfo);
    setReceiptForm(settings.receipt);
    setPrinterForm(settings.printer);
    setBusinessForm(settings.business);
  }, [settings]);

  useEffect(() => {
    fetchBackupList();
    fetchComPorts();
    checkHwPrinterStatus();
  }, [fetchBackupList, fetchComPorts, checkHwPrinterStatus]);

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        updateCafeInfo(cafeForm),
        updateReceiptSettings(receiptForm),
        updatePrinterSettings(printerForm),
        updateBusinessSettings(businessForm)
      ]);
      addToast("Settings saved to database successfully!", "success");
      checkHwPrinterStatus();
    } catch (err) {
      addToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrintCOM8 = async () => {
    setIsTestingHwPrinter(true);
    try {
      const res = await testPrinter();
      addToast(res.message || "Test print sent to COM8 printer!", "success");
    } catch (err) {
      addToast(`Test print error: ${err.message}`, "error");
    } finally {
      setIsTestingHwPrinter(false);
    }
  };

  const handleConnectBluetooth = async () => {
    setIsPairingBt(true);
    try {
      const res = await connectBluetoothPrinter();
      setBtStatus(getBluetoothPrinterStatus());
      addToast(`Connected to Bluetooth Printer: "${res.deviceName}"`, "success");
    } catch (err) {
      addToast(err.message || "Failed to pair Bluetooth printer", "error");
    } finally {
      setIsPairingBt(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    disconnectBluetoothPrinter();
    setBtStatus(getBluetoothPrinterStatus());
    addToast("Bluetooth printer disconnected", "info");
  };

  const handleTestPrintBluetooth = async () => {
    const testOrder = {
      billNo: "TEST-01",
      date: new Date().toLocaleDateString("en-IN"),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      cashierName: "System Test",
      items: [
        { name: "Sample Coffee", quantity: 1, price: 120, total: 120 },
        { name: "Thermal Test Item", quantity: 2, price: 80, total: 160 }
      ],
      subtotal: 280,
      discountAmount: 0,
      tax: 0,
      total: 280,
      paymentMethod: "TEST"
    };

    try {
      const result = await printThermalReceipt(testOrder, settings);
      if (result.method === "bluetooth") {
        addToast("Sent ESC/POS test receipt over Bluetooth!", "success");
      } else {
        addToast("Opening thermal print preview window...", "info");
      }
    } catch (err) {
      addToast(`Print test failed: ${err.message}`, "error");
    }
  };

  const handleTestPrint = () => {
    handleTestPrintBluetooth();
  };

  const handleCreateBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const result = await createBackup(token);
      addToast(`Backup created: ${result.filename} (${result.size_mb} MB)`, "success");
      fetchBackupList();
    } catch (err) {
      addToast(`Backup failed: ${err.message}`, "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <LoadingState count={4} type="table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ErrorState subtitle={error} onRetry={refreshSettings} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Settings</h2>
          <p className="text-xs text-slate-500">Configure SQLite backend branding, thermal receipt layout, and database backups</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshSettings}
            title="Reload settings from database"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Configuration Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Cafe Branding Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 pb-2 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">Cafe Branding & Contact</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Cafe Name *</label>
                <input
                  type="text"
                  value={cafeForm.name}
                  onChange={(e) => setCafeForm({ ...cafeForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Tagline / Subheader</label>
                <input
                  type="text"
                  value={cafeForm.tagline}
                  onChange={(e) => setCafeForm({ ...cafeForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">Address</label>
                <input
                  type="text"
                  value={cafeForm.address}
                  onChange={(e) => setCafeForm({ ...cafeForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={cafeForm.phone}
                  onChange={(e) => setCafeForm({ ...cafeForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">GSTIN</label>
                <input
                  type="text"
                  value={cafeForm.gstin}
                  onChange={(e) => setCafeForm({ ...cafeForm, gstin: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Thermal Receipt Preferences */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 pb-2 border-b border-slate-100">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">Receipt Options</h3>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-600 font-bold mb-2">Thermal Paper Width</label>
                <div className="flex gap-4">
                  {["80mm", "58mm"].map((w) => (
                    <label key={w} className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="radio"
                        name="paperWidth"
                        value={w}
                        checked={receiptForm.paperWidth === w}
                        onChange={(e) => setReceiptForm({ ...receiptForm, paperWidth: e.target.value })}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span>{w} Thermal Paper</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {[
                  { key: "showLogo", label: "Show Logo" },
                  { key: "showAddress", label: "Show Address" },
                  { key: "showPhone", label: "Show Phone" },
                  { key: "showGst", label: "Show GSTIN" }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50">
                    <input
                      type="checkbox"
                      checked={receiptForm[key]}
                      onChange={(e) => setReceiptForm({ ...receiptForm, [key]: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800">{label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Receipt Footer Message</label>
                <input
                  type="text"
                  value={receiptForm.footerMessage}
                  onChange={(e) => setReceiptForm({ ...receiptForm, footerMessage: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2B: Portable Bluetooth SPP Thermal Printer Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-800">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Cpu className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Thermal Printer Setup</h3>
                  <p className="text-xs text-slate-400">Portable Windows Bluetooth SPP ESC/POS Direct Driver</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                    hwPrinterStatus.connected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${hwPrinterStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span>{hwPrinterStatus.connected ? "Connected" : "Disconnected"}</span>
                </span>
              </div>
            </div>

            {/* Quick Printer Setup Wizard Stepper */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
                <span>Printer Setup Wizard</span>
                <span className="text-[10px] text-slate-400 font-mono">CIE-DYNO-2F64</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Step 1</div>
                  <div className="font-bold text-white truncate">1. Pair Bluetooth</div>
                  <div className="text-[11px] text-slate-400">Pair printer in Windows</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Step 2</div>
                  <div className="font-bold text-white truncate">2. Detect Printer</div>
                  <button
                    type="button"
                    onClick={handleDetectPrinter}
                    disabled={isDetecting || !isManager}
                    className="w-full mt-1 py-1 px-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] transition-colors disabled:opacity-50"
                  >
                    {isDetecting ? "Scanning..." : "Detect Printer"}
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Step 3</div>
                  <div className="font-bold text-white truncate">3. Verification</div>
                  <div className="text-[10px] text-emerald-400 font-bold truncate">
                    {hwPrinterStatus.connected ? `✓ Port ${hwPrinterStatus.port}` : "Waiting detection..."}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Step 4</div>
                  <div className="font-bold text-white truncate">4. Test Print</div>
                  <button
                    type="button"
                    onClick={handleTestPrintCOM8}
                    disabled={isTestingHwPrinter}
                    className="w-full mt-1 py-1 px-2 rounded bg-slate-700 hover:bg-slate-600 text-amber-300 font-extrabold text-[11px] transition-colors disabled:opacity-50"
                  >
                    {isTestingHwPrinter ? "Testing..." : "Test Print"}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Printer Settings Form */}
            <div className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Printer Device</label>
                  <input
                    type="text"
                    value={printerForm.name || "CIE-DYNO-2F64"}
                    onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                    disabled={!isManager}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Connection Type</label>
                  <input
                    type="text"
                    value="Bluetooth SPP"
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold bg-slate-100 text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Port Selection (COMxx)</label>
                  <select
                    value={printerForm.port || "AUTO"}
                    onChange={(e) => setPrinterForm({ ...printerForm, port: e.target.value })}
                    disabled={!isManager}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-amber-700 bg-amber-50/50 focus:outline-none focus:border-amber-500 disabled:opacity-70"
                  >
                    <option value="AUTO">Auto Detect (Recommended)</option>
                    {availablePorts.map((p) => (
                      <option key={p.port} value={p.port}>
                        {p.port} — {p.description || "Serial Port"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Baud Rate</label>
                  <select
                    value={printerForm.baudrate || 9600}
                    onChange={(e) => setPrinterForm({ ...printerForm, baudrate: Number(e.target.value) })}
                    disabled={!isManager}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-amber-500 disabled:opacity-70"
                  >
                    <option value={9600}>9600 (Default 8N1)</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                    <option value={115200}>115200</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Paper Width</label>
                  <select
                    value={receiptForm.paperWidth || "80mm"}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paperWidth: e.target.value })}
                    disabled={!isManager}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-amber-500 disabled:opacity-70"
                  >
                    <option value="80mm">80mm Thermal Paper</option>
                    <option value="58mm">58mm Thermal Paper</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 w-full">
                    <input
                      type="checkbox"
                      checked={printerForm.autoCut ?? true}
                      onChange={(e) => setPrinterForm({ ...printerForm, autoCut: e.target.checked })}
                      disabled={!isManager}
                      className="rounded text-amber-500 focus:ring-amber-500 disabled:opacity-50"
                    />
                    <span className="font-bold text-slate-800">Auto Cut Paper</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-3">
                <div className="text-slate-500 text-[11px] font-medium flex items-center gap-2">
                  <span>{hwPrinterStatus.message}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isManager && (
                    <button
                      type="button"
                      onClick={handleDetectPrinter}
                      disabled={isDetecting}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isDetecting ? "Detecting..." : "Detect Printer"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleTestPrintCOM8}
                    disabled={isTestingHwPrinter}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isTestingHwPrinter ? "Printing..." : "Test Print"}</span>
                  </button>

                  {isManager && (
                    <button
                      type="button"
                      onClick={handleSaveAll}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{saving ? "Saving..." : "Save Config"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2C: Bluetooth Web API Thermal Printer (Fallback) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Bluetooth className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">Bluetooth Thermal Printer</h3>
              </div>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  btStatus.connected
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {btStatus.status}
              </span>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Printer Device</div>
                  <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                    {btStatus.deviceName || "No Bluetooth Printer Connected"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {btStatus.connected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectBluetooth}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectBluetooth}
                      disabled={isPairingBt}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <Bluetooth className="w-4 h-4" />
                      <span>{isPairingBt ? "Scanning..." : "Pair Bluetooth Printer"}</span>
                    </button>
                  )}
                </div>
              </div>

              {!isWebBluetoothSupported() && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge to connect wireless Bluetooth printers.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-slate-500 text-[11px]">
                  Supports 58mm & 80mm ESC/POS Bluetooth printers (e.g. POS-58, PT-210, MTP-2, POS-80).
                </p>
                <button
                  type="button"
                  onClick={handleTestPrintBluetooth}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Send Test Print</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Business Rules */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 pb-2 border-b border-slate-100">
              <Briefcase className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">Business Rules</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={businessForm.currency}
                  onChange={(e) => setBusinessForm({ ...businessForm, currency: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Bill Prefix</label>
                <input
                  type="text"
                  value={businessForm.billPrefix}
                  onChange={(e) => setBusinessForm({ ...businessForm, billPrefix: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Starting Bill Number</label>
                <input
                  type="number"
                  value={businessForm.startingBillNumber}
                  onChange={(e) => setBusinessForm({ ...businessForm, startingBillNumber: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: MANAGER-ONLY DATABASE BACKUP */}
          {isManager && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800">
                  <Database className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-base">Database Backup & Security</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Manager Only
                  </span>
                </div>

                <button
                  onClick={handleCreateBackup}
                  disabled={isBackingUp}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>{isBackingUp ? "Creating Backup..." : "Backup Database Now"}</span>
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Generates an instant timestamped backup copy of <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">cafe_pos.db</code> in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">backend/backups/</code>. Existing backups are never overwritten.
              </p>

              {/* Existing Backups List */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Available Backups Archive</h4>
                {backups.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 font-semibold">
                    No database backups found. Click "Backup Database Now" to generate one.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                    {backups.map((b) => (
                      <div key={b.filename} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <div className="font-bold font-mono text-slate-800">{b.filename}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(b.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-700">{b.size_mb} MB</span>
                          <span className="block text-[10px] text-slate-400">({b.size_bytes.toLocaleString()} bytes)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Thermal Receipt Preview */}
        <div className="sticky top-6 flex flex-col items-center">
          <ReceiptPreview customWidth={receiptForm.paperWidth} />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
