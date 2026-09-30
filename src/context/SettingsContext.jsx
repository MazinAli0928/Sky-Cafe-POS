import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getSettings, updateSettings as apiUpdateSettings } from "../services/api";
import { DEFAULT_SETTINGS } from "../data/mockSettings";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSettings();
      // Map API snake_case fields to frontend settings shape
      setSettings({
        cafeInfo: {
          name: data.cafe_name || "YOUR CAFE",
          tagline: data.tagline || "CAFE POS",
          address: data.address || "Bengaluru, Karnataka",
          phone: data.phone || "+91 98765 43210",
          email: data.email || "orders@yourcafe.com",
          gstin: data.gstin || "29ABCDE1234F1Z5"
        },
        receipt: {
          paperWidth: data.receipt_paper_width || "80mm",
          showLogo: data.show_logo ?? true,
          showAddress: data.show_address ?? true,
          showPhone: data.show_phone ?? true,
          showGst: data.show_gst ?? true,
          footerMessage: data.footer_message || "Thank you! Please visit again."
        },
        printer: {
          name: data.printer_name || "CIE-DYNO-2F64",
          connectionType: data.printer_connection_type || "bluetooth_spp",
          enabled: data.printer_enabled ?? true,
          port: data.printer_port || "AUTO",
          baudrate: data.printer_baudrate || 9600,
          autoCut: data.printer_auto_cut ?? true,
          status: "Ready"
        },
        business: {
          currency: data.currency || "₹",
          billPrefix: data.bill_prefix || "BILL-",
          startingBillNumber: data.starting_bill_number || 1024
        }
      });
    } catch (err) {
      console.warn("Using default settings fallback:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettingsToBackend = async (payload) => {
    try {
      const updated = await apiUpdateSettings(payload);
      await fetchSettings();
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const updateCafeInfo = async (info) => {
    const payload = {
      cafe_name: info.name,
      tagline: info.tagline,
      address: info.address,
      phone: info.phone,
      email: info.email,
      gstin: info.gstin
    };
    return await saveSettingsToBackend(payload);
  };

  const updateReceiptSettings = async (receiptOptions) => {
    const payload = {
      receipt_paper_width: receiptOptions.paperWidth,
      show_logo: receiptOptions.showLogo,
      show_address: receiptOptions.showAddress,
      show_phone: receiptOptions.showPhone,
      show_gst: receiptOptions.showGst,
      footer_message: receiptOptions.footerMessage
    };
    return await saveSettingsToBackend(payload);
  };

  const updatePrinterSettings = async (printerOptions) => {
    const payload = {
      printer_name: printerOptions.name || "CIE-DYNO-2F64",
      printer_connection_type: printerOptions.connectionType || "bluetooth_spp",
      printer_enabled: printerOptions.enabled ?? true,
      printer_port: printerOptions.port || "AUTO",
      printer_baudrate: Number(printerOptions.baudrate || 9600),
      printer_auto_cut: printerOptions.autoCut ?? true
    };
    return await saveSettingsToBackend(payload);
  };

  const updateBusinessSettings = async (businessOptions) => {
    const payload = {
      currency: businessOptions.currency,
      bill_prefix: businessOptions.billPrefix,
      starting_bill_number: businessOptions.startingBillNumber
    };
    return await saveSettingsToBackend(payload);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        refreshSettings: fetchSettings,
        updateCafeInfo,
        updateReceiptSettings,
        updatePrinterSettings,
        updateBusinessSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
