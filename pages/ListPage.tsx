
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import CurrentSelectionCard from '../components/CurrentSelectionCard';
import NamesTable from '../components/NamesTable';
import AddNameModal from '../components/AddNameModal';
import AdPlaceholder from '../components/AdPlaceholder';
import AdPopup from '../components/AdPopup';
import { useUrlParams } from '../hooks/useUrlParams';
import { getInitialData, getNames, getCurrentSelection, addNameToFirebase } from '../services/firebaseService';
import type { User, Group, Section, Name, CurrentSelection } from '../types';
import { PlusIcon, UsersIcon, ExclamationTriangleIcon, ArrowPathIcon, UserCircleIcon } from '../components/Icons';

type LoadingState = 'LOADING' | 'SUCCESS' | 'ERROR';

const ListPage: React.FC = () => {
  const { uid, groupId, sectionId } = useUrlParams();
  const [loadingState, setLoadingState] = useState<LoadingState>('LOADING');
  const [errorMessage, setErrorMessage] = useState<{ title: string; subtitle: string } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [names, setNames] = useState<Name[]>([]);
  const [currentSelection, setCurrentSelection] = useState<CurrentSelection | null>(null);
  const [deviceIp, setDeviceIp] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingName, setIsAddingName] = useState(false);
  const [isAdPopupVisible, setIsAdPopupVisible] = useState(false);

  const showError = useCallback((title: string, subtitle: string) => {
    setLoadingState('ERROR');
    setErrorMessage({ title, subtitle });
  }, []);

  const loadNamesList = useCallback(async () => {
    if (!uid || !groupId || !sectionId) return;
    try {
      const namesData = await getNames(uid, groupId, sectionId);
      setNames(namesData);
    } catch (error) {
      console.error("Failed to reload names:", error);
    }
  }, [uid, groupId, sectionId]);

  const loadCurrentData = useCallback(async () => {
    if (!uid || !groupId || !sectionId) return;
    try {
      const currentData = await getCurrentSelection(uid, groupId, sectionId);
      setCurrentSelection(currentData);
    } catch (error) {
      console.error("Failed to reload current selection:", error);
    }
  }, [uid, groupId, sectionId]);

  useEffect(() => {
    const fetchIpAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (response.ok) {
          const data = await response.json();
          setDeviceIp(data.ip);
        }
      } catch (error) {
        console.warn("Could not fetch device IP for highlighting:", error);
      }
    };
    
    fetchIpAddress();

    const initialize = async () => {
      if (!uid || !groupId || !sectionId) {
        showError('Missing Parameters', 'URL must include uid, group, and section parameters.');
        return;
      }

      try {
        setLoadingState('LOADING');
        const data = await getInitialData(uid, groupId, sectionId);
        setUser(data.user);
        setGroup(data.group);
        setSection(data.section);
        setCurrentSelection(data.currentSelection);
        setNames(data.names);
        setLoadingState('SUCCESS');
      } catch (error: any) {
        showError('Data Loading Error', error.message || 'An unknown error occurred.');
      }
    };
    initialize();
  }, [uid, groupId, sectionId, showError]);

  useEffect(() => {
    const currentInterval = setInterval(loadCurrentData, 15000);
    const namesInterval = setInterval(loadNamesList, 300000); // 5 minutes
    const adInterval = setInterval(() => {
        setIsAdPopupVisible(true);
    }, 480000); // 8 minutes

    return () => {
      clearInterval(currentInterval);
      clearInterval(namesInterval);
      clearInterval(adInterval);
    };
  }, [loadCurrentData, loadNamesList]);


  const handleAddName = async (fullName: string) => {
    if (!uid || !groupId || !sectionId || !user) return;

    setIsAddingName(true);
    try {
      const currentNamesCount = names.length;
      const newNameData = {
        fullName,
        rowNumber: currentNamesCount + 1,
        createdAt: new Date().toISOString(),
        addedBy: user.id,
        ipAddress: deviceIp || undefined,
      };
      await addNameToFirebase(uid, groupId, sectionId, newNameData);
      await loadNamesList(); // Refresh the list
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding name:", error);
      alert("Failed to add name. Please try again.");
    } finally {
      setIsAddingName(false);
    }
  };
  
  const { topTenNames, userAddedNamesNotInTopTen } = useMemo(() => {
    const topTen = names.slice(0, 10);
    if (!deviceIp) {
      return { topTenNames: topTen, userAddedNamesNotInTopTen: [] };
    }
    
    const topTenIds = new Set(topTen.map(n => n.id));
    
    const userAddedNotInTop = names
      .filter(name => name.ipAddress === deviceIp && !topTenIds.has(name.id));
      
    return { topTenNames: topTen, userAddedNamesNotInTopTen: userAddedNotInTop };
  }, [names, deviceIp]);

  const renderContent = () => {
    if (loadingState === 'LOADING') {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-white">
          <ArrowPathIcon className="w-12 h-12 animate-spin mb-4" />
          <p className="text-xl font-medium">Loading list data...</p>
        </div>
      );
    }

    if (loadingState === 'ERROR' && errorMessage) {
      return (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-lg text-center mx-auto max-w-2xl">
            <div className="text-red-500 mb-4 flex justify-center"><ExclamationTriangleIcon className="w-16 h-16"/></div>
            <h3 className="text-2xl font-bold text-slate-800">{errorMessage.title}</h3>
            <p className="text-slate-600 mt-2">{errorMessage.subtitle}</p>
        </div>
      );
    }
    
    if (loadingState === 'SUCCESS' && section) {
      return (
        <>
            <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white [text-shadow:_0_2px_4px_rgb(0_0_0_/_20%)] mb-2">List View: {section.name}</h1>
                <p className="text-white/90 text-lg">Manage the list of names for this section.</p>
                {/* Static button for larger screens */}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-6 hidden sm:inline-flex items-center gap-2 bg-white/20 text-white border-2 border-white/30 backdrop-blur-sm font-semibold px-6 py-3 rounded-full hover:bg-white/30 transition-transform transform hover:-translate-y-1 shadow-lg"
                >
                    <PlusIcon className="w-6 h-6" /> Add New Name
                </button>
            </div>

            <CurrentSelectionCard currentSelection={currentSelection} />
            
            <AdPlaceholder imageId="101" className="mb-8" />

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl pb-24 sm:pb-8 space-y-8">
                {/* Main list (Top 10) */}
                <div>
                    {topTenNames.length > 0 ? (
                        <NamesTable names={topTenNames} deviceIp={deviceIp} />
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-slate-400 mb-4 flex justify-center"><UsersIcon className="w-20 h-20"/></div>
                            <h3 className="text-2xl font-bold text-slate-800">No Names Yet</h3>
                            <p className="text-slate-500 mt-2">Add your first name to get started!</p>
                        </div>
                    )}
                </div>

                {/* User's other added names */}
                {userAddedNamesNotInTopTen.length > 0 && (
                    <>
                        <AdPlaceholder imageId="102" />
                        <div>
                            <div className="border-t border-slate-200 -mx-4 sm:-mx-8 my-6"></div>
                            <div className="flex items-center gap-3 mb-6 px-4 sm:px-0">
                                 <UserCircleIcon className="w-8 h-8 text-teal-600" />
                                <h3 className="text-xl font-bold text-slate-800">Your Added Names</h3>
                            </div>
                            <NamesTable names={userAddedNamesNotInTopTen} deviceIp={deviceIp} />
                        </div>
                    </>
                )}
            </div>
            
            <div className="mt-8 space-y-8">
                <AdPlaceholder imageId="103" />
                <AdPlaceholder imageId="104" />
            </div>

            {/* FAB for smaller screens */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="sm:hidden fixed bottom-6 right-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 transform hover:scale-110 transition-transform"
              aria-label="Add New Name"
            >
              <PlusIcon className="w-8 h-8" />
            </button>
        </>
      );
    }

    return null;
  };

  return (
    <>
      <Header user={user} group={group} section={section} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {renderContent()}
      </main>
      <AddNameModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddName={handleAddName}
        isAdding={isAddingName}
      />
      <AdPopup 
        isOpen={isAdPopupVisible}
        onClose={() => setIsAdPopupVisible(false)}
      />
    </>
  );
};

export default ListPage;
