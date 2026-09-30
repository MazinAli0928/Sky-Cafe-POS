export const DEFAULT_SETTINGS = {
  cafeInfo: {
    name: "SKY CAFE",
    tagline: "MYSORE",
    address: "Mysore, Karnataka",
    phone: "+91 98765 43210",
    email: "orders@yourcafe.com",
    gstin: "29ABCDE1234F1Z5"
  },
  receipt: {
    paperWidth: "80mm", // "58mm" or "80mm"
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showGst: true,
    footerMessage: "THANK YOU! VISIT AGAIN"
  },
  printer: {
    name: "POS-Thermal-80",
    status: "Ready", // "Ready", "Warning", "Offline"
    ipAddress: "192.168.1.150",
    connectionType: "USB/Network"
  },
  business: {
    currency: "₹",
    billPrefix: "BILL-",
    startingBillNumber: 1024
  }
};
