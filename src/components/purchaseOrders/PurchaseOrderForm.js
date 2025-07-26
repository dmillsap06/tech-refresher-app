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

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-3 inset-y-0 flex items-center text-gray-400 pointer-events-none";

const formatMoney = (val) => {
  if (val === '' || isNaN(val)) return '';
  return Number(val).toFixed(2);
};

const categoryDisplayMap = {
  Part: "Part",
  Accessory: "Accessory",
  Device: "Device",
  Game: "Game"
};

const getFormattedDate = () => {
    const now = new Date();
    const options = {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    
    const timeStr = new Intl.DateTimeFormat('en-US', options).format(now);
    
    const dateOptions = {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    const dateStr = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
    
    // Add the ordinal suffix (st, nd, rd, th) to the day
    const dayMatch = dateStr.match(/(\d+),/);
    if (dayMatch && dayMatch[1]) {
      const day = parseInt(dayMatch[1], 10);
      let suffix = 'th';
      
      if (day % 10 === 1 && day !== 11) {
        suffix = 'st';
      } else if (day % 10 === 2 && day !== 12) {
        suffix = 'nd';
      } else if (day % 10 === 3 && day !== 13) {
        suffix = 'rd';
      }
      
      // Replace the day number with day + suffix
      const formattedDate = dateStr.replace(/(\d+),/, `$1${suffix},`);
      return `${formattedDate} ${timeStr} EST`;
    }
    
    return `${dateStr} ${timeStr} EST`;
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
  const [catalogOptions, setCatalogOptions] = useState({});
  const [catalogLoading, setCatalogLoading] = useState({});
  const [catalogErrors, setCatalogErrors] = useState({});

  const [showCreateModal, setShowCreateModal] = useState({ open: false, category: null, lineIdx: null });

  const latestFetchRef = useRef({});
  
  // Debounce search terms
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerms(searchTerms), 200);
    return () => clearTimeout(handler);
  }, [searchTerms]);

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

  useEffect(() => {
    lineItems.forEach((item, idx) => {
      fetchCatalogOptions(item.category, debouncedSearchTerms[idx] || "", idx);
    });
    // eslint-disable-next-line
  }, [debouncedSearchTerms, lineItems.map(i => i.category).join(",")]);

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
          ? { ...item, category: value, linkedId: '' }
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

  const handleDollarChange = setter => e => {
    // Allow negative sign for Other Fees
    let val = e.target.value.replace(/[^0-9.-]/g, '');
    // Make sure only one negative sign at the beginning and only one decimal point
    if (val.startsWith('-') && val.indexOf('-', 1) !== -1) {
      val = '-' + val.replace(/-/g, '');
    }
    if ((val.match(/\./g) || []).length > 1) {
      val = val.replace(/\./g, (match, offset) => offset === val.indexOf('.') ? match : '');
    }
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
  
  // Validate that all line items are linked to a catalog item
  for (const li of lineItems) {
    if (!li.linkedId) {
      showNotification('All line items must be linked to a catalog item.', 'error');
      setIsSaving(false);
      return;
    }
  }
  
  try {
    // Get the formatted date once
    const formattedDate = getFormattedDate();
    // Create actual timestamp for proper date handling
    const now = new Date();
    
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
          at: formattedDate,             // Human-readable string
          timestamp: Timestamp.fromDate(now), // Firestore timestamp for sorting
          by: userProfile.username
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-7xl relative flex flex-col" style={{ height: '90vh', maxHeight: '90vh' }}>
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300">New Purchase Order</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: '0px' }}>
          <form id="po-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Vendor, Vendor Order #, and Date on one row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  className={inputClass} 
                  value={vendor} 
                  onChange={e => setVendor(e.target.value)} 
                  placeholder="Vendor name"
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor Order # <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  className={inputClass} 
                  value={vendorOrderNumber} 
                  onChange={e => setVendorOrderNumber(e.target.value)} 
                  placeholder="Vendor's order number"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  className={inputClass} 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea 
                className={inputClass + " resize-none"} 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                rows={2} 
                placeholder="Add notes or explain 'Other Fees' here..."
              />
            </div>
            
            {/* Line Items Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Line Items <span className="text-red-500">*</span>
                </label>
                <button 
                  type="button" 
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center"
                  onClick={handleAddLine}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                          Qty
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                          Unit Price
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                          Category
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Catalog Item
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {lineItems.map((item, idx) => {
                        const category = item.category;
                        const searchTerm = searchTerms[idx] || '';
                        const filteredCatalog = catalogOptions[idx] || [];
                        const isLoading = catalogLoading[idx];
                        const hasCatalogError = !!catalogErrors[idx];
                        const activeIdx = dropdownActiveIdx[idx] ?? -1;

                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                            <td className="px-3 py-2">
                              <input 
                                type="text" 
                                className={inputClass + " text-sm"}
                                value={item.description} 
                                onChange={e => handleLineChange(idx, 'description', e.target.value)} 
                                placeholder="Item description"
                                required 
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input 
                                type="number" 
                                className={inputClass + " text-sm text-center"} 
                                value={item.quantity} 
                                min={1} 
                                onChange={e => handleLineChange(idx, 'quantity', e.target.value)} 
                                required 
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className={dollarInputWrapper}>
                                <span className={dollarPrefix}>$</span>
                                <input
                                  type="text"
                                  className={inputClass + " pl-7 text-sm text-right"} 
                                  value={item.unitPrice}
                                  onChange={handleLineDollarChange(idx, 'unitPrice')}
                                  onBlur={handleLineDollarBlur(idx, 'unitPrice')}
                                  required
                                  inputMode="decimal"
                                  placeholder="0.00"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <select 
                                className={inputClass + " text-sm"} 
                                value={item.category} 
                                onChange={e => handleLineCategoryChange(idx, e.target.value)}
                              >
                                <option value="Part">Part</option>
                                <option value="Accessory">Accessory</option>
                                <option value="Device">Device</option>
                                <option value="Game">Game</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              {hasCatalogError ? (
                                <div className="text-red-500 text-xs py-1">
                                  Failed to load catalog: {catalogErrors[idx]}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <input
                                    type="text"
                                    className={inputClass + " text-sm"}
                                    placeholder={`Search ${categoryDisplayMap[category]}...`}
                                    value={searchTerm}
                                    onChange={e => handleSearchChange(idx, e.target.value)}
                                    onKeyDown={e => handleDropdownKeyDown(idx, filteredCatalog, e)}
                                    autoComplete="off"
                                  />
                                  <div className="relative">
                                    <select
                                      ref={el => (dropdownRefs.current[`${idx}`] = el)}
                                      className={inputClass + " text-sm"}
                                      value={item.linkedId || ''}
                                      onChange={e => handleLinkSelect(idx, e.target.value)}
                                      required
                                      size={Math.min(filteredCatalog.length + 2, 4)} // Limit height
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
                                          className={activeIdx === i ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" : ""}
                                        >
                                          {catItem.name}
                                        </option>
                                      ))}
                                      <option value="_create_new" className="font-medium text-indigo-600 dark:text-indigo-400">
                                        + Add New {categoryDisplayMap[category]}...
                                      </option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {lineItems.length > 1 && (
                                <button 
                                  type="button" 
                                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                  onClick={() => handleRemoveLine(idx)} 
                                  title="Remove item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Costs Section - Two columns on larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Additional Costs</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Shipping Cost
                    </label>
                    <div className={dollarInputWrapper}>
                      <span className={dollarPrefix}>$</span>
                      <input
                        type="text"
                        className={inputClass + " pl-7"} 
                        value={shippingCost}
                        onChange={handleDollarChange(setShippingCost)}
                        onBlur={handleDollarBlur(setShippingCost)}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax
                    </label>
                    <div className={dollarInputWrapper}>
                      <span className={dollarPrefix}>$</span>
                      <input
                        type="text"
                        className={inputClass + " pl-7"} 
                        value={tax}
                        onChange={handleDollarChange(setTax)}
                        onBlur={handleDollarBlur(setTax)}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Other Fees <span className="text-xs text-gray-400">(can be negative for discounts)</span>
                    </label>
                    <div className={dollarInputWrapper}>
                      <span className={dollarPrefix}>$</span>
                      <input
                        type="text"
                        className={inputClass + " pl-7"} 
                        value={otherFees}
                        onChange={handleDollarChange(setOtherFees)}
                        onBlur={handleDollarBlur(setOtherFees)}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Summary</h3>
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Subtotal:</dt>
                      <dd className="text-sm font-medium">${formatMoney(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Shipping:</dt>
                      <dd className="text-sm font-medium">${formatMoney(shippingCost || 0)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Tax:</dt>
                      <dd className="text-sm font-medium">${formatMoney(tax || 0)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Other Fees:</dt>
                      <dd className={`text-sm font-medium ${Number(otherFees) < 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                        ${formatMoney(otherFees || 0)}
                      </dd>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between">
                        <dt className="text-base font-medium text-gray-900 dark:text-white">Total:</dt>
                        <dd className="text-base font-bold text-gray-900 dark:text-white">${formatMoney(total)}</dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer with action buttons - Fixed */}
        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button 
            type="button" 
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="po-form"
            className="px-5 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" 
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : "Save Purchase Order"}
          </button>
        </div>
      </div>
      
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
  );
};

export default PurchaseOrderForm;