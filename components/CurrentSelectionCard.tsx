
import React from 'react';
import type { CurrentSelection } from '../types';
import { CalendarDaysIcon, ArrowPathIcon } from './Icons';

interface CurrentSelectionCardProps {
    currentSelection: CurrentSelection | null;
}

const CurrentSelectionCard: React.FC<CurrentSelectionCardProps> = ({ currentSelection }) => {
    const isLoading = !currentSelection && typeof currentSelection === 'undefined';
    const isEmpty = currentSelection === null;
    
    return (
        <div className="flex justify-center mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-white/20 w-full max-w-lg text-center">
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-700 mb-4">
                    <CalendarDaysIcon className="w-6 h-6 text-teal-500" />
                    Current Selection
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center gap-3 text-slate-500 py-5">
                         <ArrowPathIcon className="w-6 h-6 animate-spin"/>
                        <span className="font-medium">Loading current selection...</span>
                    </div>
                )}
                
                {isEmpty && !isLoading && (
                     <div className="text-slate-500 py-5 font-medium">
                        No current selection set
                    </div>
                )}
                
                {!isEmpty && !isLoading && currentSelection && (
                    <div className="flex flex-col sm:flex-row justify-around items-center gap-4 sm:gap-6 py-2">
                        <div className="text-center">
                            <div className="text-sm text-slate-500 mb-1 font-medium">Current Row</div>
                            <div className="text-2xl sm:text-3xl font-bold text-teal-500">{currentSelection.currentRow || '-'}</div>
                        </div>
                         <div className="text-center">
                            <div className="text-sm text-slate-500 mb-1 font-medium">Current Name</div>
                            <div className="text-2xl sm:text-3xl font-bold text-slate-800">{currentSelection.currentName || '-'}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurrentSelectionCard;