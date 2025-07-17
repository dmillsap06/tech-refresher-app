import React, { useEffect, useState, useCallback } from 'react';

const Notification = ({ message, type, onClose }) => {
    const [visible, setVisible] = useState(false);

    const handleClose = useCallback(() => {
        setVisible(false);
        // Allow time for fade-out animation before calling the parent's onClose
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);


    useEffect(() => {
        if (message) {
            setVisible(true);
            const timer = setTimeout(() => {
                handleClose();
            }, 5000); // Notification disappears after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [message, type, handleClose]);

    const baseStyle = "fixed top-5 right-5 w-full max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 z-50";
    const typeStyles = {
        error: "bg-red-500 text-white",
        success: "bg-green-500 text-white",
    };
    const visibilityStyle = visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full";

    if (!message) return null;

    return (
        <div className={`${baseStyle} ${typeStyles[type] || 'bg-gray-700 text-white'} ${visibilityStyle}`}>
            <div className="flex items-start justify-between">
                <p className="font-medium">{message}</p>
                <button onClick={handleClose} className="ml-4 text-xl font-bold leading-none">&times;</button>
            </div>
        </div>
    );
};

export default Notification;