import React, { useEffect } from 'react';

/**
 * A reusable modal component.
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is open or not.
 * @param {function} props.onClose - Function to call when the modal should be closed.
 * @param {React.ReactNode} props.children - The content to be displayed inside the modal.
 * @param {string} [props.widthClass='max-w-2xl'] - Tailwind CSS class for the modal's max-width.
 */
const Modal = ({ isOpen, onClose, children, widthClass = 'max-w-2xl' }) => {

    // Effect to handle closing the modal with the 'Escape' key
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        // The main modal overlay
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose} // Close modal when clicking the overlay
        >
            {/* The modal content box */}
            <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${widthClass} max-h-full flex flex-col`}
                onClick={e => e.stopPropagation()} // Prevent clicks inside the modal from closing it
            >
                {/* The children prop will render whatever component is passed into the Modal */}
                {children}
            </div>
        </div>
    );
};

export default Modal;