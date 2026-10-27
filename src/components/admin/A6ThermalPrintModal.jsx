import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import BarcodeSvg from '../common/BarcodeSvg';
import QrCodeSvg from '../common/QrCodeSvg';

export default function A6ThermalPrintModal({ isOpen, onClose, order }) {
  const [activePageIndex, setActivePageIndex] = useState(1);
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);

  if (!isOpen || !order) return null;

  const trackingNumber = order.tracking_number || 'JT-UNASSIGNED';
  const orderRef = order.order_reference || 'AC-000000';
  const isCod = (order.payment_method || '').toUpperCase() === 'COD';
  const totalAmount = Number(order.total_amount) || Number(order.subtotal) || 0;
  const items = Array.isArray(order.items) ? order.items : [];
  const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

  // Geographic Hub code resolution matching existing Aura layout
  const city = order.shipping_address?.city || '';
  const prov = order.shipping_address?.province || '';
  const hubCode = (() => {
    const c = city.toLowerCase();
    const p = prov.toLowerCase();
    if (c.includes('makati')) return 'MNL-MAK-01';
    if (c.includes('quezon')) return 'MNL-QC-02';
    if (c.includes('taguig')) return 'MNL-TAG-01';
    if (c.includes('pasig')) return 'MNL-PSG-01';
    if (c.includes('malabon') || c.includes('caloocan') || p.includes('bulacan')) return 'MNL-NORTH-01';
    if (c.includes('cebu') || p.includes('cebu')) return 'CEB-HUB-01';
    if (c.includes('davao') || p.includes('davao')) return 'DVO-HUB-01';
    return 'MNL-HUB-01';
  })();

  const contentSpecification =
    items.length > 0
      ? items
          .map((it) => {
            const sizeLabel = typeof it.size === 'object' ? it.size?.name : it.size || 'Std';
            return `${it.name} (${it.quantity || 1}x, ${sizeLabel})`;
          })
          .join(', ')
      : 'Aura Garments / Apparel';

  const formattedAddress = order.shipping_address
    ? `${order.shipping_address.street || ''}, ${order.shipping_address.barangay || ''} ${order.shipping_address.city || ''}, ${order.shipping_address.province || ''} ${order.shipping_address.postal_code || order.shipping_address.zipCode || order.shipping_address.zip || ''}`
        .replace(/\s+,/g, ',')
        .trim()
    : 'Standard Delivery Address';

  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const now = new Date();
  const dispatchDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const jtexpressTrackingUrl = trackingNumber && trackingNumber !== 'JT-UNASSIGNED'
    ? `https://www.jtexpress.ph/trajectoryQuery?bills=${trackingNumber}`
    : `https://aura-clothing.vercel.app/order/${orderRef}`;

  const scrollToPage = (pageNum) => {
    setActivePageIndex(pageNum);
    if (pageNum === 1 && page1Ref.current) {
      page1Ref.current.scrollIntoView({ behavior: 'smooth' });
    } else if (pageNum === 2 && page2Ref.current) {
      page2Ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative bg-slate-900 w-full max-w-5xl h-full sm:h-[95vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header Bar (Hidden in Print) */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400/10 text-amber-400 p-2 rounded-xl border border-amber-400/20">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white font-sans">
                    Official Air Waybill (AWB) & Packing List
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    A6 (105mm × 148mm) • 2 Pages
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Order <strong className="text-white">{orderRef}</strong> • J&T Tracking:{' '}
                  <strong className="text-amber-400 font-mono">{trackingNumber}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Waybill & Packing List</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body: Left Thumbnails + Right Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Thumbnails (Hidden in Print) */}
            <div className="w-32 bg-slate-950/80 border-r border-slate-800 p-3 space-y-4 overflow-y-auto shrink-0 no-print">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-1">
                Pages (2)
              </span>

              {/* Thumbnail 1: Existing AWB Layout */}
              <div
                onClick={() => scrollToPage(1)}
                className={`cursor-pointer group rounded-lg p-1.5 transition-all text-center ${
                  activePageIndex === 1
                    ? 'ring-2 ring-amber-400 bg-slate-800/80 shadow-md'
                    : 'hover:bg-slate-800/40 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="w-full aspect-[105/148] bg-white rounded border border-slate-300 overflow-hidden shadow-xs flex flex-col justify-between p-1.5 text-[5px] text-slate-900 pointer-events-none font-mono">
                  <div className="border-b border-slate-900 pb-0.5 flex justify-between items-center">
                    <span className="bg-red-600 text-white font-black px-1">J&T</span>
                    <span className="bg-slate-900 text-white font-bold px-1 text-[4.5px]">{hubCode}</span>
                  </div>
                  <div className="h-5 bg-slate-200 my-0.5 flex items-center justify-center">
                    <span className="text-[4px] tracking-tight">|||||||||||||||</span>
                  </div>
                  <div className="text-[5px] font-bold truncate">{order.customer_name}</div>
                  <div className="border-t border-slate-900 pt-0.5 flex justify-between text-[4.5px]">
                    <span>{orderRef}</span>
                    <span className="font-bold">{isCod ? 'COD' : 'PREPAID'}</span>
                  </div>
                </div>
                <span className="block text-xs font-bold text-slate-300 mt-1.5">1</span>
                <span className="block text-[9px] text-slate-400">Waybill</span>
              </div>

              {/* Thumbnail 2: Packing List */}
              <div
                onClick={() => scrollToPage(2)}
                className={`cursor-pointer group rounded-lg p-1.5 transition-all text-center ${
                  activePageIndex === 2
                    ? 'ring-2 ring-amber-400 bg-slate-800/80 shadow-md'
                    : 'hover:bg-slate-800/40 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="w-full aspect-[105/148] bg-white rounded border border-slate-300 overflow-hidden shadow-xs flex flex-col justify-between p-1.5 text-[5px] text-slate-900 pointer-events-none font-sans">
                  <div className="border-b border-slate-900 pb-0.5 flex justify-between font-bold">
                    <span>AURA</span>
                    <span>Order List</span>
                  </div>
                  <div className="space-y-0.5 my-1">
                    <div className="h-1 bg-slate-300 w-full" />
                    <div className="h-1 bg-slate-200 w-4/5" />
                    <div className="h-1 bg-slate-200 w-3/5" />
                  </div>
                  <div className="border-t border-slate-900 pt-0.5 flex justify-between font-bold text-[4.5px]">
                    <span>Items: {items.length}</span>
                    <span>Qty: {totalQty}</span>
                  </div>
                </div>
                <span className="block text-xs font-bold text-slate-300 mt-1.5">2</span>
                <span className="block text-[9px] text-slate-400">Order List</span>
              </div>
            </div>

            {/* Right Main Preview Canvas */}
            <div className="flex-1 bg-slate-800/60 overflow-y-auto p-4 sm:p-8 flex flex-col items-center gap-8 printable-thermal-canvas">
              {/* PAGE 1: EXISTING AURA OFFICIAL AIR WAYBILL (A6: 105mm x 148mm) */}
              <div
                ref={page1Ref}
                onClick={() => setActivePageIndex(1)}
                className="a6-sheet a6-page-1 bg-white text-slate-900 font-mono shadow-2xl relative select-text"
                style={{
                  width: '105mm',
                  minHeight: '148mm',
                  height: '148mm',
                  padding: '3mm',
                  boxSizing: 'border-box',
                }}
              >
                <div className="w-full h-full border-2 border-slate-900 p-3 flex flex-col justify-between text-slate-900 print:border-none print:p-0">
                  {/* Carrier & Sort Code Header with QR Code */}
                  <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-red-600 text-white font-black text-xl px-2.5 py-0.5 tracking-tighter">
                        J&T
                      </div>
                      <div>
                        <span className="text-xl font-black tracking-tight block leading-tight">
                          EXPRESS
                        </span>
                        <span className="text-[8.5px] font-sans font-bold uppercase tracking-wider text-slate-600 block">
                          Official Air Waybill (AWB)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <span className="text-lg font-black tracking-wider block bg-slate-900 text-white px-2 py-0.5 leading-tight">
                          {hubCode}
                        </span>
                        <span className="text-[8px] font-bold block pt-0.5 text-slate-700">
                          STANDARD AIR
                        </span>
                      </div>
                      <div className="border border-slate-900 p-0.5 bg-white shrink-0">
                        <QrCodeSvg value={jtexpressTrackingUrl} size={36} margin={0} />
                      </div>
                    </div>
                  </div>

                  {/* Scannable Barcode & Tracking Code */}
                  <div className="py-1 text-center border-b-2 border-slate-900 space-y-0.5">
                    <div className="flex items-center justify-center min-h-[44px]">
                      <BarcodeSvg
                        value={trackingNumber}
                        format="CODE128"
                        width={1.8}
                        height={42}
                        className="mx-auto"
                      />
                    </div>
                    <div className="font-bold text-xs tracking-widest uppercase font-mono">
                      {trackingNumber}
                    </div>
                  </div>

                  {/* Shipper & Consignee Grid */}
                  <div className="grid grid-cols-2 border-b-2 border-slate-900 text-[9px] divide-x-2 divide-slate-900">
                    <div className="p-1.5 space-y-0.5">
                      <span className="font-bold uppercase tracking-wider block text-[8px] text-slate-500">
                        FROM (SHIPPER):
                      </span>
                      <p className="font-bold text-[10px] text-slate-900">Aura Atelier Dispatch Hub</p>
                      <p className="text-slate-800">09171234567</p>
                      <p className="text-slate-700 leading-tight text-[8.5px]">
                        108 Atelier Blvd, Salcedo Village, Bel-Air, Makati City, Metro Manila 1209
                      </p>
                    </div>

                    <div className="p-1.5 space-y-0.5 bg-amber-50/40">
                      <span className="font-bold uppercase tracking-wider block text-[8px] text-slate-500">
                        TO (CONSIGNEE):
                      </span>
                      <p className="font-bold text-[10px] text-slate-900">{order.customer_name}</p>
                      <p className="font-bold text-slate-800">{order.customer_phone}</p>
                      <p className="text-slate-800 leading-tight text-[8.5px]">{formattedAddress}</p>
                    </div>
                  </div>

                  {/* Parcel Details & Payment Terms */}
                  <div className="text-[9px] space-y-1.5 pt-1 border-b-2 border-slate-900 pb-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-[9.5px]">Order Ref: {orderRef}</span>
                      {isCod ? (
                        <span className="bg-red-600 text-white px-2 py-0.5 text-[8.5px] font-sans font-black rounded-xs">
                          COLLECT COD (₱{totalAmount.toLocaleString()})
                        </span>
                      ) : (
                        <span className="bg-emerald-700 text-white px-2 py-0.5 text-[8.5px] font-sans font-bold rounded-xs">
                          PREPAID (NON-COD)
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-1.5 border border-slate-300">
                      <span className="block font-bold text-[8px] text-slate-500 mb-0.5">
                        CONTENT SPECIFICATION:
                      </span>
                      <p className="truncate text-[8.5px] text-slate-900">{contentSpecification}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center font-bold text-[8.5px]">
                      <div className="border border-slate-300 p-1">
                        <span className="block text-[7.5px] text-slate-500 font-sans">WEIGHT</span>
                        <span>0.35 KG</span>
                      </div>
                      <div className="border border-slate-300 p-1">
                        <span className="block text-[7.5px] text-slate-500 font-sans">COURIER</span>
                        <span>J&T EXPRESS</span>
                      </div>
                      <div
                        className={`border p-1 ${
                          isCod
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        <span
                          className={`block text-[7.5px] font-sans ${
                            isCod ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          COLLECT COD
                        </span>
                        <span>₱{isCod ? totalAmount.toLocaleString() : '0.00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Notice */}
                  <div className="pt-1 flex items-center justify-between text-[8px] text-slate-600">
                    <span>Date: {orderDate}</span>
                    <span>Recipient Signature: __________________</span>
                  </div>
                </div>
              </div>

              {/* PAGE 2: ORDER LIST / PACKING SLIP (A6: 105mm x 148mm) */}
              <div
                ref={page2Ref}
                onClick={() => setActivePageIndex(2)}
                className="a6-sheet a6-page-2 bg-white text-slate-900 font-sans shadow-2xl relative select-text"
                style={{
                  width: '105mm',
                  minHeight: '148mm',
                  height: '148mm',
                  padding: '3mm',
                  boxSizing: 'border-box',
                }}
              >
                <div className="w-full h-full border-2 border-slate-900 p-3.5 flex flex-col justify-between text-[8px] leading-tight print:border-none print:p-0">
                  {/* Packing Slip Header */}
                  <div className="border-b-2 border-slate-900 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-serif font-black text-xs text-slate-900 tracking-wide uppercase">
                          AURA Women's Clothing
                        </h4>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                          Packing Slip & Item Checklist
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[9px] block">
                          {orderRef}
                        </span>
                        <span className="text-[7.5px] text-slate-500">
                          Date: {dispatchDate}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-slate-200 flex justify-between text-[7.5px] text-slate-600">
                      <span>Customer: <strong className="text-slate-900">{order.customer_name}</strong></span>
                      <span>J&T Tracking: <strong className="font-mono text-slate-900">{trackingNumber}</strong></span>
                    </div>
                  </div>

                  {/* Items Checklist Table */}
                  <div className="flex-1 py-1.5 flex flex-col overflow-hidden">
                    <table className="w-full text-left border-collapse text-[7.5px]">
                      <thead>
                        <tr className="border-b-2 border-slate-900 font-bold uppercase text-[7px] text-slate-700">
                          <th className="py-1 pr-1 w-[46%]">Product Description</th>
                          <th className="py-1 px-1 w-[24%]">Variation</th>
                          <th className="py-1 px-1 text-center w-[15%]">Check</th>
                          <th className="py-1 pl-1 text-right w-[15%]">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map((item, idx) => {
                          const sizeName =
                            typeof item.size === 'object' ? item.size?.name : item.size || 'Standard';
                          const variation = [item.color || '', sizeName].filter(Boolean).join(' / ');

                          return (
                            <tr key={idx} className="align-top">
                              <td className="py-1 pr-1 leading-tight font-medium text-slate-900">
                                <div className="font-bold text-[8px] truncate">{item.name || 'Aura Garment'}</div>
                                <div className="text-[6.5px] text-slate-500 font-mono">
                                  SKU: {String(item.id || `AURA-${idx + 1}`).slice(0, 10)}
                                </div>
                              </td>
                              <td className="py-1 px-1 text-slate-700 uppercase font-semibold text-[7px]">
                                {variation || 'Standard'}
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className="inline-block w-3.5 h-3.5 border border-slate-400 rounded-xs" />
                              </td>
                              <td className="py-1 pl-1 text-right font-black text-slate-900 text-[8.5px]">
                                {item.quantity || 1}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Total Quantity */}
                    <div className="border-t-2 border-slate-900 mt-auto pt-1 flex justify-between items-center font-bold text-[8.5px]">
                      <span className="text-slate-600 uppercase text-[7.5px]">Total Items: {items.length}</span>
                      <span className="font-black text-slate-900">Total Quantity: {totalQty}</span>
                    </div>
                  </div>

                  {/* Footer Order Ref Barcode & Note */}
                  <div className="border-t-2 border-slate-900 pt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[7px] text-slate-600">
                      <span>Packed & inspected for quality dispatch</span>
                      <span>Payment: <strong className="text-slate-900">{isCod ? `COD ₱${totalAmount.toLocaleString()}` : 'Prepaid'}</strong></span>
                    </div>

                    <div className="pt-0.5 text-center flex flex-col items-center">
                      <BarcodeSvg
                        value={orderRef}
                        format="CODE128"
                        width={1.5}
                        height={22}
                        className="mx-auto"
                      />
                      <span className="font-mono text-[7px] text-slate-600 block pt-0.5">
                        {orderRef}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
