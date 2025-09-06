
import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowPathIcon } from './Icons';

interface AddNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddName: (fullName: string) => Promise<void>;
    isAdding: boolean;
}

const AddNameModal: React.FC<AddNameModalProps> = ({ isOpen, onClose, onAddName, isAdding }) => {
    const [fullName, setFullName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFullName('');
        }
    }, [isOpen]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fullName.trim()) {
            onAddName(fullName.trim());
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 p-6 sm:p-8 transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative text-center mb-6">
                    <button onClick={onClose} className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition">
                       <XMarkIcon className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">Add New Name</h2>
                    <p className="text-slate-500 mt-1">Enter the full name to add to the list.</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter full name"
                            required
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                        />
                    </div>
                    
                    <div className="flex justify-end gap-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isAdding}
                            className="px-6 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isAdding ? (
                                <>
                                 <ArrowPathIcon className="w-5 h-5 animate-spin"/>
                                 Adding...
                                </>
                            ) : (
                                'Add Name'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddNameModal;
