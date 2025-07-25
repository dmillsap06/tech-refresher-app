import React, { useState } from 'react';
import SettingsProfile from './SettingsProfile';
import SettingsInvite from './SettingsInvite';
import SettingsGroup from './SettingsGroup';
import SettingsCatalog from './SettingsCatalog';
import PaymentMethodsList from './PaymentMethodsList'; 
import ShippingCarriersSettings from './ShippingCarriersSettings'; // <-- Import the component

const TABS = [
    { id: "profile", label: "Profile" },
    { id: "invite", label: "Invite User" },
    { id: "group", label: "Group Info" },
    { id: "catalog", label: "Catalog" },
    { id: "payment", label: "Payment Methods" },
    { id: "carriers", label: "Shipping Carriers" }, // <-- Add new tab
];

const Settings = ({ onBack, showNotification, userProfile }) => {
    const [activeTab, setActiveTab] = useState("profile");

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">App Settings</h1>
                </div>
            </header>

            {/* TABS */}
            <div className="max-w-7xl mx-auto py-4 px-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`px-4 py-2 font-semibold rounded-t transition-colors ${
                            activeTab === tab.id
                                ? "bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600 dark:border-indigo-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-750"
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 text-gray-800 dark:text-gray-200">
                {activeTab === "profile" && (
                    <SettingsProfile userProfile={userProfile} />
                )}
                {activeTab === "invite" && (
                    <SettingsInvite userProfile={userProfile} showNotification={showNotification} />
                )}
                {activeTab === "group" && (
                    <SettingsGroup userProfile={userProfile} showNotification={showNotification} />
                )}
                {activeTab === "catalog" && (
                    <SettingsCatalog userProfile={userProfile} showNotification={showNotification} />
                )}
                {activeTab === "payment" && (
                    <PaymentMethodsList userProfile={userProfile} showNotification={showNotification} />
                )}
                {activeTab === "carriers" && (
                    <ShippingCarriersSettings groupId={userProfile.groupId} />
                )}
            </main>
        </div>
    );
};

export default Settings;