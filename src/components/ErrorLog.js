import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import logError from '../utils/logError';

const CheckCircleIcon = ({ className = "" }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M6.5 10.5l2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
);

const CheckIcon = ({ className = "" }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
        <path d="M6 10.5l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
);

const ErrorLog = ({ onBack, showNotification }) => {
    const [errorLogs, setErrorLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updating, setUpdating] = useState({}); // Track updating state per log

    useEffect(() => {
        const logsCollectionRef = collection(db, 'error_logs');
        const q = query(logsCollectionRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setErrorLogs(logs);
            setIsLoading(false);
        }, (error) => {
            logError && logError("ErrorLog-Fetch", error);
            setIsLoading(false);
            if (showNotification) showNotification("Failed to load error logs.", "error");
        });

        return () => unsubscribe();
    }, [showNotification]);

    const markResolved = async (id) => {
        setUpdating(prev => ({ ...prev, [id]: true }));
        try {
            const logRef = doc(db, 'error_logs', id);
            await updateDoc(logRef, { resolved: true });
        } catch (err) {
            logError && logError('ErrorLog-MarkResolved', err);
            if (showNotification) showNotification('Failed to mark as resolved. See console for details.', 'error');
        } finally {
            setUpdating(prev => ({ ...prev, [id]: false }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
                    <button
                        onClick={onBack}
                        className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        &larr; Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Admin Error Log</h1>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Timestamp', 'User ID', 'Location', 'Error Message', 'Status', 'Action'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading error logs...</td></tr>
                            ) : errorLogs.length > 0 ? errorLogs.map((log) => (
                                <tr key={log.id} className={log.resolved ? "opacity-60" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.userId || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{log.location}</td>
                                    <td className="px-6 py-4 text-sm text-red-500">{log.errorMessage}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {log.resolved ? (
                                            <span className="text-green-600 font-semibold">Resolved</span>
                                        ) : (
                                            <span className="text-yellow-600 font-semibold">Unresolved</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {!log.resolved ? (
                                            <button
                                                onClick={() => markResolved(log.id)}
                                                disabled={updating[log.id]}
                                                title="Resolve"
                                                className="group p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900 transition"
                                                style={{ minWidth: 0, minHeight: 0, border: 'none', background: 'none' }}
                                            >
                                                <CheckCircleIcon className={`w-5 h-5 text-green-600 group-hover:text-green-800 dark:group-hover:text-green-400 ${updating[log.id] ? 'animate-pulse opacity-60' : ''}`} />
                                            </button>
                                        ) : (
                                            <span title="Resolved">
                                                <CheckIcon className="w-5 h-5 text-green-500" />
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No errors have been logged.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default ErrorLog;