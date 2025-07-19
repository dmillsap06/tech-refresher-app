import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, Timestamp, query, where, orderBy, limit } from 'firebase/firestore';
import logError from '../../utils/logError';
import CreatePartModal from './CreatePartModal';
import CreateAccessoryModal from './CreateAccessoryModal';
import CreateDeviceModal from './CreateDeviceModal';
import CreateGameModal from './CreateGameModal';

const defaultLineItem = {
  description: '',
  quantity: 1,
  unitPrice: '',
  category: 'Part',
  linkedId: ''
};

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";
const inputCenterClass =
  inputClass + " text-center";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 inset-y-0 flex items-center text-gray-400 pointer-events-none";

function formatMoney(val) {
  if (val === '' || isNaN(val)) return '';
  return Number(val).toFixed(2);
}

const categoryDisplayMap = {
  Part: "Part",
  Accessory: "Accessory",
  Device: "Device",
  Game: "Game"
};

const CATALOG_LIMIT = 15;

const PurchaseOrderForm = ({ userProfile, onClose, showNotification }) => {
  const [vendor, setVendor] = useState('');
  const [vendorOrderNumber, setVendorOrderNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substr(0, 10));
  const [status] = useState('Created');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([{ ...defaultLineItem }]);
  const [shippingCost, setShippingCost] = useState('');
  const [otherFees, setOtherFees] = useState('');
  const [tax, setTax] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Per-line search terms, active dropdown idx, and async options
  const [searchTerms, setSearchTerms] = useState({});
  const [debouncedSearchTerms, setDebouncedSearchTerms] = useState({});
  const [dropdownActiveIdx, setDropdownActiveIdx] = useState({});
  const [catalogOptions, setCatalogOptions] = useState({}); // { [lineIdx]: [options] }
  const [catalogLoading, setCatalogLoading] = useState({}); // { [lineIdx]: bool }
  const [catalogErrors, setCatalogErrors] = useState({}); // { [lineIdx]: errorMsg }

  // Modal state for "Add New"
  const [showCreateModal, setShowCreateModal] = useState({ open: false, category: null, lineIdx: null });

  // Keep a ref to the last fetched search to avoid race conditions
  const latestFetchRef = useRef({});

  // Debounce search terms for async fetch
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerms(searchTerms), 200);
    return () => clearTimeout(handler);
  }, [searchTerms]);

  // Async fetch catalog options for a line item
  const fetchCatalogOptions = async (category, searchTerm, lineIdx) => {
    if (!userProfile?.groupId) return;
    setCatalogLoading(prev => ({ ...prev, [lineIdx]: true }));
    setCatalogErrors(prev => ({ ...prev, [lineIdx]: undefined }));
    let col;
    if (category === "Part") col = "parts";
    else if (category === "Accessory") col = "accessories";
    else if (category === "Device") col = "deviceTypes";
    else if (category === "Game") col = "games";
    else return;

    // For text search, use Firestore range queries (prefix match)
    let q;
    const terms = (searchTerm || "").trim();
    if (terms.length > 0) {
      q = query(
        collection(db, col),
        where('groupId', '==', userProfile.groupId),
        orderBy('name'),
        where('name', '>=', terms),
        where('name', '<=', terms + '\uf8ff'),
        limit(CATALOG_LIMIT)
      );
    } else {
      q = query(
        collection(db, col),
        where('groupId', '==', userProfile.groupId),
        orderBy('name'),
        limit(CATALOG_LIMIT)
      );
    }

    const thisFetchId = Math.random().toString(36).substr(2, 9);
    latestFetchRef.current[lineIdx] = thisFetchId;
    try {
      const snap = await getDocs(q);
      if (latestFetchRef.current[lineIdx] === thisFetchId) {
        setCatalogOptions(prev => ({
          ...prev,
          [lineIdx]: snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }));
        setCatalogErrors(prev => ({ ...prev, [lineIdx]: undefined }));
      }
    } catch (err) {
      logError(`PurchaseOrderForm-AsyncCatalog-${col}`, err);
      setCatalogOptions(prev => ({ ...prev, [lineIdx]: [] }));
      setCatalogErrors(prev => ({ ...prev, [lineIdx]: err.message || "Unknown error" }));
    } finally {
      setCatalogLoading(prev => ({ ...prev, [lineIdx]: false }));
    }
  };

  // Refetch catalog options when debounced search or category changes
  useEffect(() => {
    lineItems.forEach((item, idx) => {
      fetchCatalogOptions(item.category, debouncedSearchTerms[idx] || "", idx);
    });
    // eslint-disable-next-line
  }, [debouncedSearchTerms, lineItems.map(i => i.category).join(",")]);

  // Keyboard navigation for dropdown
  const dropdownRefs = useRef({});
  const handleDropdownKeyDown = (idx, filteredCatalog, e) => {
    let curIdx = dropdownActiveIdx[idx] ?? -1;
    if (e.key === "ArrowDown") {
      curIdx = Math.min(curIdx + 1, filteredCatalog.length - 1);
      setDropdownActiveIdx(d => ({ ...d, [idx]: curIdx }));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      curIdx = Math.max(curIdx - 1, 0);
      setDropdownActiveIdx(d => ({ ...d, [idx]: curIdx }));
      e.preventDefault();
    } else if (e.key === "Enter" && curIdx >= 0) {
      handleLinkSelect(idx, filteredCatalog[curIdx].id);
      setDropdownActiveIdx(d => ({ ...d, [idx]: -1 }));
      e.preventDefault();
    }
  };

  const handleSearchChange = (idx, val) => {
    setSearchTerms(terms => ({ ...terms, [idx]: val }));
  };

  const handleLineChange = (index, field, value) => {
    setLineItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleLineCategoryChange = (index, value) => {
    setLineItems(items =>
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              category: value,
              linkedId: ''
            }
          : item
      )
    );
    setSearchTerms(terms => ({ ...terms, [index]: '' }));
  };

  const handleAddLine = () => setLineItems(items => [...items, { ...defaultLineItem }]);
  const handleRemoveLine = (index) => setLineItems(items => items.filter((_, i) => i !== index));

  const subtotal = lineItems.reduce((sum, li) =>
    sum + (Number(li.quantity) * Number(li.unitPrice || 0)), 0
  );
  const total = subtotal + Number(tax || 0) + Number(shippingCost || 0) + Number(otherFees || 0);

  // For dollar fields: allow only numbers and one dot, but keep as string for easier typing
  const handleDollarChange = setter => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    setter(val);
  };

  const handleDollarBlur = setter => e => {
    let val = e.target.value;
    if (!val || isNaN(val)) {
      setter('');
      return;
    }
    setter(Number(val).toFixed(2));
  };

  const handleLineDollarChange = (index, field) => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    handleLineChange(index, field, val);
  };

  const handleLineDollarBlur = (index, field) => e => {
    let val = e.target.value;
    if (!val || isNaN(val)) {
      handleLineChange(index, field, '');
      return;
    }
    handleLineChange(index, field, Number(val).toFixed(2));
  };

  const handleLinkSelect = (idx, value) => {
    if (value === "_create_new") {
      setShowCreateModal({ open: true, category: lineItems[idx].category, lineIdx: idx });
      return;
    }
    setLineItems(items =>
      items.map((item, i) =>
        i === idx
          ? { ...item, linkedId: value }
          : item
      )
    );
  };

  // After creating a new catalog item, update and link it
  const handleCreatedCatalogItem = (category, newItem) => {
    setShowCreateModal({ open: false, category: null, lineIdx: null });
    if (showCreateModal.lineIdx !== null) {
      fetchCatalogOptions(category, "", showCreateModal.lineIdx);
      setLineItems(items =>
        items.map((item, i) =>
          i === showCreateModal.lineIdx
            ? { ...item, linkedId: newItem.id }
            : item
        )
      );
    }
    setSearchTerms(terms => ({ ...terms, [showCreateModal.lineIdx]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    for (const li of lineItems) {
      if (!li.linkedId) {
        showNotification('All line items must be linked to a catalog item.', 'error');
        setIsSaving(false);
        return;
      }
    }
    try {
      const poData = {
        poNumber: '',
        vendor,
        vendorOrderNumber,
        date: Timestamp.fromDate(new Date(date)),
        status,
        notes,
        groupId: userProfile.groupId,
        lineItems: lineItems.map(li => ({
          ...li,
          unitPrice: li.unitPrice === '' ? 0 : Number(li.unitPrice),
          quantity: Number(li.quantity),
          quantityReceived: 0
        })),
        subtotal,
        shippingCost: shippingCost === '' ? 0 : Number(shippingCost),
        otherFees: otherFees === '' ? 0 : Number(otherFees),
        tax: tax === '' ? 0 : Number(tax),
        total,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        statusHistory: [
          {
            status: "Created",
            at: new Date().toISOString(),
            by: userProfile.displayName || userProfile.name || userProfile.email || "Unknown"
          }
        ]
      };
      await addDoc(collection(db, 'purchase_orders'), poData);
      showNotification('Purchase Order created!', 'success');
      onClose();
    } catch (err) {
      logError('PurchaseOrderForm-Submit', err);
      showNotification('Failed to create PO: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50" style={{ minHeight: "100vh" }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-7xl relative flex flex-col h-[98vh]">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-2xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">New Purchase Order</h2>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Vendor + Date Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-3">
            <div className="flex-1">
              <label className="block font-medium mb-1">Vendor</label>
              <input type="text" className={inputClass} value={vendor} onChange={e => setVendor(e.target.value)} required />
            </div>
            <div className="w-full md:w-40">
              <label className="block font-medium mb-1">Date</label>
              <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>
          {/* Vendor Order # */}
          <div className="mb-3">
            <label className="block font-medium mb-1">Vendor Order #</label>
            <input type="text" className={inputClass} value={vendorOrderNumber} onChange={e => setVendorOrderNumber(e.target.value)} />
          </div>
          {/* Notes */}
          <div className="mb-3">
            <label className="block font-medium mb-1">Notes</label>
            <textarea className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Add notes or explain 'Other Fees' here..." />
          </div>
          {/* Line Items */}
          <div className="mb-3 flex-1 flex flex-col min-h-0">
            <label className="block font-medium mb-2">Line Items</label>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="min-w-full border rounded mb-2 text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-center">Description</th>
                    <th className="px-2 py-1 text-center">Qty</th>
                    <th className="px-2 py-1 text-center">Unit Price</th>
                    <th className="px-2 py-1 text-center">Category</th>
                    <th className="px-2 py-1 text-center">Link</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => {
                    const category = item.category;
                    const searchTerm = searchTerms[idx] || '';
                    const filteredCatalog = catalogOptions[idx] || [];
                    const isLoading = catalogLoading[idx];
                    const hasCatalogError = !!catalogErrors[idx];
                    const activeIdx = dropdownActiveIdx[idx] ?? -1;

                    return (
                      <tr key={idx}>
                        <td className="align-middle text-center">
                          <input type="text" className={inputCenterClass} value={item.description} onChange={e => handleLineChange(idx, 'description', e.target.value)} required />
                        </td>
                        <td className="align-middle text-center">
                          <input type="number" className={inputCenterClass} value={item.quantity} min={1} style={{ width: 60 }} onChange={e => handleLineChange(idx, 'quantity', e.target.value)} required />
                        </td>
                        <td className="align-middle text-center">
                          <div className={dollarInputWrapper}>
                            <span className={dollarPrefix}>$</span>
                            <input
                              type="text"
                              className={inputCenterClass + " pl-6"}
                              value={item.unitPrice}
                              min={0}
                              step="0.01"
                              style={{ width: 90 }}
                              onChange={handleLineDollarChange(idx, 'unitPrice')}
                              onBlur={handleLineDollarBlur(idx, 'unitPrice')}
                              required
                              inputMode="decimal"
                              pattern="^\d+(\.\d{1,2})?$"
                            />
                          </div>
                        </td>
                        <td className="align-middle text-center">
                          <select className={inputCenterClass} value={item.category} onChange={e => handleLineCategoryChange(idx, e.target.value)}>
                            <option value="Part">Part</option>
                            <option value="Accessory">Accessory</option>
                            <option value="Device">Device</option>
                            <option value="Game">Game</option>
                          </select>
                        </td>
                        <td className="align-middle text-center">
                          <div className="flex flex-col gap-1 relative">
                            {hasCatalogError ? (
                              <div className="text-red-500 text-sm py-2">Failed to load {category} catalog: {catalogErrors[idx]}</div>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  className={inputCenterClass + " mb-1"}
                                  placeholder={`Search ${categoryDisplayMap[category]}...`}
                                  value={searchTerm}
                                  onChange={e => handleSearchChange(idx, e.target.value)}
                                  onKeyDown={e => handleDropdownKeyDown(idx, filteredCatalog, e)}
                                  autoComplete="off"
                                />
                                <div className="relative">
                                  <select
                                    ref={el => (dropdownRefs.current[`${idx}`] = el)}
                                    className={inputCenterClass + " appearance-none"}
                                    value={item.linkedId || ''}
                                    onChange={e => handleLinkSelect(idx, e.target.value)}
                                    required
                                    size={Math.min(filteredCatalog.length + 2, 8)}
                                    style={{ width: "100%" }}
                                    onBlur={() => setDropdownActiveIdx(d => ({ ...d, [idx]: -1 }))}
                                  >
                                    <option value="" disabled>
                                      {isLoading
                                        ? "Loading..."
                                        : filteredCatalog.length === 0 && searchTerm
                                          ? "No matches"
                                          : `Select ${categoryDisplayMap[category]}...`}
                                    </option>
                                    {filteredCatalog.map((catItem, i) => (
                                      <option
                                        key={catItem.id}
                                        value={catItem.id}
                                        style={{
                                          background: activeIdx === i ? "#e0e7ff" : "",
                                          color: activeIdx === i ? "#3730a3" : ""
                                        }}
                                      >
                                        {catItem.name}
                                      </option>
                                    ))}
                                    <option value="_create_new">+ Add New {categoryDisplayMap[category]}...</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="align-middle text-center">
                          {lineItems.length > 1 && (
                            <button type="button" className="text-red-500 text-lg px-2" onClick={() => handleRemoveLine(idx)} title="Remove">×</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" className="text-indigo-600 hover:underline text-sm" onClick={handleAddLine}>+ Add Line Item</button>
          </div>
          {/* Shipping Cost & Other Fees */}
          <div className="mb-3 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block font-medium mb-1">Shipping Cost</label>
              <div className={dollarInputWrapper}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={shippingCost}
                  min={0}
                  step="0.01"
                  onChange={handleDollarChange(setShippingCost)}
                  onBlur={handleDollarBlur(setShippingCost)}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Other Fees <span className="text-xs text-gray-400">(describe in notes)</span></label>
              <div className={dollarInputWrapper}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={otherFees}
                  min={0}
                  step="0.01"
                  onChange={handleDollarChange(setOtherFees)}
                  onBlur={handleDollarBlur(setOtherFees)}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            </div>
          </div>
          {/* Tax + Totals */}
          <div className="mb-3 flex flex-wrap gap-4 justify-end">
            <div>
              <label className="block text-xs text-gray-500">Subtotal</label>
              <div className="font-medium">${formatMoney(subtotal)}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Tax</label>
              <div className={dollarInputWrapper + " w-20"}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={tax}
                  min={0}
                  step="0.01"
                  onChange={handleDollarChange(setTax)}
                  onBlur={handleDollarBlur(setTax)}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Total</label>
              <div className="font-bold">${formatMoney(total)}</div>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Purchase Order"}
            </button>
          </div>
        </form>
        {/* Add New Modals */}
        {showCreateModal.open && showCreateModal.category === "Part" && (
          <CreatePartModal
            userProfile={userProfile}
            onCreated={item => handleCreatedCatalogItem("Part", item)}
            onClose={() => setShowCreateModal({ open: false, category: null, lineIdx: null })}
            showNotification={showNotification}
          />
        )}
        {showCreateModal.open && showCreateModal.category === "Accessory" && (
          <CreateAccessoryModal
            userProfile={userProfile}
            onCreated={item => handleCreatedCatalogItem("Accessory", item)}
            onClose={() => setShowCreateModal({ open: false, category: null, lineIdx: null })}
            showNotification={showNotification}
          />
        )}
        {showCreateModal.open && showCreateModal.category === "Device" && (
          <CreateDeviceModal
            userProfile={userProfile}
            onCreated={item => handleCreatedCatalogItem("Device", item)}
            onClose={() => setShowCreateModal({ open: false, category: null, lineIdx: null })}
            showNotification={showNotification}
          />
        )}
        {showCreateModal.open && showCreateModal.category === "Game" && (
          <CreateGameModal
            userProfile={userProfile}
            onCreated={item => handleCreatedCatalogItem("Game", item)}
            onClose={() => setShowCreateModal({ open: false, category: null, lineIdx: null })}
            showNotification={showNotification}
          />
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderForm;