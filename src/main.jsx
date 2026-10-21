import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

export default function DeliveryChallanApp() {
  // State for Challan Fields & Transport Settings
  const [challan, setChallan] = useState({
    dcNo: 'DC-20261021-001',
    date: '21-10-2026',
    purchaseOrderNo: 'PO-12345',
    dispatchDocNo: 'TRANSFER',
    transportMode: 'VRL LOGISTICS',
    vehicleNo: '-',
    lrNo: '-',
    modeOfPayment: 'Online / Bank Transfer',
    termsOfDelivery: 'Our own materials moved from one site to another.',
    otherReferences: '-',
    shipFrom: {
      company: 'AtomPlus Technologies Private Limited',
      address: 'No. D-1902, 19th Floor, Tower D,\nShriram Greenfields, Bommanahalli Village,\nBangalore - Karnataka 560049, India.',
      phone: '+91 80 0000 0000'
    },
    shipTo: {
      company: 'ABC Enterprises',
      address: 'Plot No. 45, Industrial Area,\nSolapur - 413001, Maharashtra, India',
      contact: 'Mr. Ramesh Patil - 9876543210'
    },
    // Pre-loaded items with HSN/SAC, automated rates and descriptions
    items: [
      { description: 'SS 304 Flexible Hose pipe-2" (1500 mm)', hsn: '83071000', unit: 'Nos', quantity: 2, rate: 3500.00 },
      { description: 'SS 304 Elbow 90°', hsn: '73079200', unit: 'Nos', quantity: 5, rate: 450.00 },
      { description: 'SS 304 Tee Connector', hsn: '73079300', unit: 'Nos', quantity: 3, rate: 380.00 },
      { description: 'SS 304 Clamp', hsn: '83071000', unit: 'Nos', quantity: 10, rate: 120.00 }
    ]
  });

  const calculateTotal = () => {
    return challan.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.rate)), 0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[210mm] mx-auto p-4 bg-gray-100 min-h-screen font-sans text-xs">
      
      {/* Print Action Button (Hidden on Print) */}
      <div className="mb-4 flex justify-between items-center print:hidden">
        <h1 className="font-bold text-gray-800 text-sm">AtomPlus Challan Portal</h1>
        <button
          onClick={handlePrint}
          className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
        >
          🖨️ Print / Save as PDF
        </button>
      </div>

      {/* A4 Printable Container */}
      <div className="bg-white text-black p-6 border-2 border-blue-900 print:border-none print:p-0 shadow-lg">
        
        {/* ================= LETTERHEAD HEADER ================= */}
        <div className="flex items-center justify-between border-b-2 border-blue-900 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            {/* Logo Mark */}
            <div className="w-14 h-14 bg-white flex items-center justify-center">
              <svg viewBox="0 0 500 350" className="w-full h-full">
                <path d="M250 20 L400 300 L320 300 L250 120 L180 300 L100 300 Z" fill="#ffcc00" />
                <path d="M180 200 C220 150 280 150 320 220 C280 280 200 280 160 220 Z" fill="#e60000" />
                <path d="M100 300 L180 300 C210 260 230 240 250 220 C220 300 150 320 100 300 Z" fill="#003366" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#003366] tracking-tight">
                AtomPlus Technologies Private Limited[cite: 5]
              </h1>
              <p className="text-blue-600 font-medium text-[11px]">https://atomplus.in[cite: 5]</p>
              <p className="text-gray-700 text-[10px] mt-0.5">
                <span className="font-bold">Registered Office:</span> No. D-1902, 19th Floor, Tower D, Shriram Greenfields, Bommanahalli Village, Bangalore - Karnataka 560049, India.[cite: 5]
              </p>
              <p className="text-gray-700 text-[10px]">
                <span className="font-bold">CIN:</span> U40106KA2022PTC165701[cite: 5]
              </p>
            </div>
          </div>
          <div className="text-right border-l-2 border-blue-600 pl-4">
            <p className="text-blue-900 font-bold text-xs">Innovative Solutions</p>
            <p className="text-blue-900 font-bold text-xs">for a Better Tomorrow[cite: 5]</p>
          </div>
        </div>

        {/* ================= TITLE BAR ================= */}
        <div className="bg-[#003366] text-white text-center font-bold py-1.5 text-base tracking-widest uppercase mb-0">
          Delivery Challan[cite: 5]
        </div>

        {/* ================= DETAILS GRID ================= */}
        <div className="border border-blue-900">
          <div className="grid grid-cols-4 border-b border-blue-900">
            
            {/* Col 1 & 2: Ship From & Ship To */}
            <div className="col-span-2 border-r border-blue-900 p-2">
              <div className="bg-blue-50 font-bold text-blue-900 px-1 py-0.5 mb-1 text-[11px]">
                Ship From (Dispatch Address)[cite: 5]
              </div>
              <p className="font-bold">{challan.shipFrom.company}</p>
              <p className="whitespace-pre-line text-gray-700">{challan.shipFrom.address}</p>
              <p className="text-gray-700 mt-1">Phone: {challan.shipFrom.phone}</p>

              <div className="bg-blue-50 font-bold text-blue-900 px-1 py-0.5 mt-3 mb-1 text-[11px]">
                Ship To (Delivery Address)[cite: 5]
              </div>
              <p className="font-bold">{challan.shipTo.company}</p>
              <p className="whitespace-pre-line text-gray-700">{challan.shipTo.address}</p>
              <p className="text-gray-700 mt-1">Contact: {challan.shipTo.contact}</p>
            </div>

            {/* Col 3: Reference Fields */}
            <div className="border-r border-blue-900 flex flex-col justify-between">
              <div className="border-b border-blue-900 p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">DC No.</span>
                <span className="font-bold">{challan.dcNo}</span>
              </div>
              <div className="border-b border-blue-900 p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Purchase Order No.</span>
                <span className="font-medium">{challan.purchaseOrderNo}</span>
              </div>
              <div className="border-b border-blue-900 p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Dispatch Doc No.</span>
                <span className="font-bold">{challan.dispatchDocNo}</span>
              </div>
              <div className="p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Bill of Lading / LR-RR No.</span>
                <span>{challan.lrNo}</span>
              </div>
            </div>

            {/* Col 4: Date, Terms, and Transport Mode Settings */}
            <div className="flex flex-col justify-between">
              <div className="border-b border-blue-900 p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Date</span>
                <span className="font-medium">{challan.date}</span>
              </div>
              <div className="border-b border-blue-900 p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Terms of Delivery</span>
                <span className="text-[11px] leading-tight block">{challan.termsOfDelivery}</span>
              </div>
              {/* Transport Mode Selection Setting */}
              <div className="border-b border-blue-900 p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Transport Mode</span>
                <select
                  value={challan.transportMode}
                  onChange={(e) => setChallan({ ...challan, transportMode: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded p-1 font-bold text-[11px] text-blue-900 print:border-none print:p-0"
                >
                  <option value="VRL LOGISTICS">VRL LOGISTICS</option>
                  <option value="DTDC">DTDC</option>
                  <option value="OWN VEHICLE">OWN VEHICLE</option>
                  <option value="BLUE DART">BLUE DART</option>
                </select>
              </div>
              <div className="border-b border-blue-900 p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Vehicle No.</span>
                <span>{challan.vehicleNo}</span>
              </div>
              <div className="p-1.5">
                <span className="text-gray-600 font-semibold block text-[10px]">Other References</span>
                <span>{challan.otherReferences}</span>
              </div>
            </div>

          </div>

          {/* ================= ITEMS TABLE ================= */}
          <div className="grid grid-cols-12 bg-blue-100 font-bold text-center border-b border-blue-900 py-1.5 text-blue-900">
            <div className="col-span-1 border-r border-blue-900">SNO</div>
            <div className="col-span-5 border-r border-blue-900">Description of Goods</div>
            <div className="col-span-2 border-r border-blue-900">HSN/SAC</div>
            <div className="col-span-1 border-r border-blue-900">UNIT</div>
            <div className="col-span-1 border-r border-blue-900">Quantity</div>
            <div className="col-span-1 border-r border-blue-900">Rate</div>
            <div className="col-span-1">Amount</div>
          </div>

          {/* Render Item Rows + Blank padding rows */}
          {Array.from({ length: Math.max(challan.items.length, 8) }).map((_, idx) => {
            const item = challan.items[idx];
            return (
              <div key={idx} className="grid grid-cols-12 border-b border-blue-900 text-center h-8 items-center">
                <div className="col-span-1 border-r border-blue-900">{idx + 1}</div>
                <div className="col-span-5 border-r border-blue-900 text-left px-2 truncate">{item?.description || ''}</div>
                <div className="col-span-2 border-r border-blue-900 font-mono">{item?.hsn || ''}</div>
                <div className="col-span-1 border-r border-blue-900">{item?.unit || (item ? 'Nos' : '')}</div>
                <div className="col-span-1 border-r border-blue-900 font-semibold">{item?.quantity || ''}</div>
                <div className="col-span-1 border-r border-blue-900 text-right px-2">{item?.rate ? `₹ ${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}</div>
                <div className="col-span-1 text-right px-2 font-medium">{item ? `₹ ${(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}</div>
              </div>
            );
          })}

          {/* ================= TOTAL ROW ================= */}
          <div className="grid grid-cols-12 bg-blue-50 font-bold border-b border-blue-900 py-2 text-right text-blue-900">
            <div className="col-span-11 pr-4 uppercase">TOTAL</div>
            <div className="col-span-1 pr-2 font-mono">₹ {calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>

          {/* ================= FOOTER NOTICE BANNER ================= */}
          <div className="bg-[#ffe599] text-center font-medium py-1.5 text-[11px] text-blue-900 border-b border-blue-900">
            {challan.termsOfDelivery}
          </div>

          {/* ================= AUTHORISED SIGNATURE BLOCK ================= */}
          <div className="p-4 flex justify-between items-end h-28">
            <div>
              <p className="text-[10px] text-gray-500 italic">This is a computer-generated delivery challan.</p>
            </div>
            <div className="text-right">
              <div className="border-t border-blue-900 w-48 mb-1"></div>
              <p className="font-bold text-blue-900 text-xs">Authorised Signature[cite: 5]</p>
              <p className="text-[10px] text-gray-600">For AtomPlus Technologies Pvt. Ltd.[cite: 5]</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// Mount app root for main.jsx
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DeliveryChallanApp />);
}
