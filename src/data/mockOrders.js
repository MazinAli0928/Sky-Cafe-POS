export const INITIAL_ORDERS = [
  {
    id: "ord-1024",
    billNo: "1024",
    date: "20 Sep 2026",
    time: "14:32",
    dateTime: "2026-09-20 14:32",
    items: [
      { id: "p7", name: "Chicken Strips", quantity: 2, price: 149, total: 298 },
      { id: "p1", name: "French Fries", quantity: 1, price: 99, total: 99 },
      { id: "p2", name: "Peri Peri French Fries", quantity: 1, price: 109, total: 109 }
    ],
    itemCount: 4,
    subtotal: 506,
    discount: 0,
    tax: 0,
    total: 506,
    paymentMethod: "UPI",
    status: "Paid"
  },
  {
    id: "ord-1023",
    billNo: "1023",
    date: "20 Sep 2026",
    time: "14:15",
    dateTime: "2026-09-20 14:15",
    items: [
      { id: "p3", name: "Potato Cheese Shots", quantity: 1, price: 149, total: 149 },
      { id: "p9", name: "Cold Coffee", quantity: 2, price: 129, total: 258 }
    ],
    itemCount: 3,
    subtotal: 407,
    discount: 20,
    tax: 0,
    total: 387,
    paymentMethod: "Card",
    status: "Paid"
  },
  {
    id: "ord-1022",
    billNo: "1022",
    date: "20 Sep 2026",
    time: "13:48",
    dateTime: "2026-09-20 13:48",
    items: [
      { id: "p6", name: "Chicken Tandoori Popcorn", quantity: 1, price: 149, total: 149 },
      { id: "p1", name: "French Fries", quantity: 1, price: 99, total: 99 }
    ],
    itemCount: 2,
    subtotal: 248,
    discount: 0,
    tax: 0,
    total: 248,
    paymentMethod: "Cash",
    status: "Paid"
  },
  {
    id: "ord-1021",
    billNo: "1021",
    date: "20 Sep 2026",
    time: "13:20",
    dateTime: "2026-09-20 13:20",
    items: [
      { id: "p7", name: "Chicken Strips", quantity: 3, price: 149, total: 447 },
      { id: "p10", name: "Iced Peach Tea", quantity: 2, price: 99, total: 198 },
      { id: "p11", name: "Chocolate Lava Cake", quantity: 1, price: 139, total: 139 }
    ],
    itemCount: 6,
    subtotal: 784,
    discount: 50,
    tax: 0,
    total: 734,
    paymentMethod: "UPI",
    status: "Paid"
  },
  {
    id: "ord-1020",
    billNo: "1020",
    date: "20 Sep 2026",
    time: "12:55",
    dateTime: "2026-09-20 12:55",
    items: [
      { id: "p4", name: "Tandoori Nuggets", quantity: 2, price: 109, total: 218 },
      { id: "p5", name: "Veg Cuts", quantity: 1, price: 109, total: 109 }
    ],
    itemCount: 3,
    subtotal: 327,
    discount: 0,
    tax: 0,
    total: 327,
    paymentMethod: "Cash",
    status: "Paid"
  }
];
