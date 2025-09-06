
import React from 'react';
import { XMarkIcon } from './Icons';
import AdPlaceholder from './AdPlaceholder';

interface AdPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdPopup: React.FC<AdPopupProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4 p-6 sm:p-8 transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-3 right-3 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition z-10">
                    <XMarkIcon className="w-5 h-5 text-slate-600" />
                </button>
                <h3 className="text-center font-bold text-slate-700 text-lg mb-4">Advertisement</h3>
                <AdPlaceholder imageId="999" />
            </div>
        </div>
    );
};

export default AdPopup;
