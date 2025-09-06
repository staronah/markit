
import React from 'react';
import type { User, Group, Section } from '../types';

interface HeaderProps {
    user: User | null;
    group: Group | null;
    section: Section | null;
}

const Header: React.FC<HeaderProps> = ({ user, group, section }) => {

    const goToDashboard = () => {
        if (user) {
            window.location.href = `?uid=${user.id}`;
            alert(`Navigating to dashboard for user ID: ${user.id}. \n(This is a placeholder action as full routing is not implemented)`);
        }
    };

    const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';

    return (
        <header className="bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3 sm:py-4">
                    <div className="text-2xl sm:text-3xl font-bold">
                        <span className="bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent cursor-pointer" onClick={goToDashboard}>
                            Markit
                        </span>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
                        <h2 className="text-xl font-semibold text-slate-700 text-center">
                           {group && section ? `${group.name} - ${section.name}` : 'Loading...'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-800 hidden sm:block">{user?.displayName || 'User'}</span>
                             <div 
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg bg-cover bg-center"
                                style={{ backgroundImage: user?.photoURL ? `url(${user.photoURL})` : 'none' }}
                            >
                                {!user?.photoURL && userInitial}
                            </div>
                        </div>
                    </div>
                </div>
                 {/* Title for mobile view */}
                <div className="sm:hidden text-center pb-3 border-t border-slate-200 -mx-4 px-4 pt-3">
                    <h2 className="text-base font-semibold text-slate-700 truncate">{group && section ? `${group.name} - ${section.name}` : ' '}</h2>
                </div>
            </div>
        </header>
    );
};

export default Header;