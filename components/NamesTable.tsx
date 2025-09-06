import React from 'react';
import type { Name } from '../types';
import { UserCircleIcon } from './Icons';

interface NamesTableProps {
    names: Name[];
    deviceIp: string | null;
}

const NamesTable: React.FC<NamesTableProps> = ({ names, deviceIp }) => {
    return (
        <>
            {/* Mobile View: Card List */}
            <div className="sm:hidden space-y-3">
                {names.map((name) => {
                    const isUserAdded = name.ipAddress && name.ipAddress === deviceIp;
                    const cardClasses = `rounded-lg p-3 flex items-center gap-4 shadow-sm border relative overflow-hidden ${
                        isUserAdded ? 'bg-teal-50 border-teal-400' : 'bg-slate-50/50 border-slate-200/50'
                    }`;

                    return (
                        <div key={name.id} className={cardClasses}>
                            {isUserAdded && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500"></div>}
                            <div className={`flex-shrink-0 w-10 h-10 text-teal-700 font-bold rounded-full flex items-center justify-center ${isUserAdded ? 'bg-teal-100' : 'bg-slate-200'}`}>
                                {name.rowNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-800 font-medium truncate">{name.fullName}</p>
                                {isUserAdded && (
                                     <div className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold mt-1">
                                        <UserCircleIcon className="w-4 h-4"/>
                                        <span>Added by You</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-24">Row #</th>
                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Full Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {names.map((name) => {
                             const isUserAdded = name.ipAddress && name.ipAddress === deviceIp;
                             const rowClasses = `border-b border-slate-200 last:border-b-0 transition-colors relative ${
                                 isUserAdded ? 'bg-teal-50 hover:bg-teal-100' : 'hover:bg-slate-50'
                             }`;

                            return (
                                <tr key={name.id} className={rowClasses}>
                                    <td className="p-4 font-bold text-teal-600">
                                        {isUserAdded && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500"></div>}
                                        {name.rowNumber}
                                    </td>
                                    <td className="p-4 text-slate-800 font-medium">
                                        <div className="flex items-center gap-3">
                                            <span>{name.fullName}</span>
                                            {isUserAdded && (
                                                <div className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold bg-teal-100 px-2 py-1 rounded-full">
                                                    <UserCircleIcon className="w-4 h-4"/>
                                                    <span>You</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default NamesTable;