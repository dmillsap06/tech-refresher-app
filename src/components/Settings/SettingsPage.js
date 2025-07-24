import React, { useState } from 'react';
import SettingsProfile from './SettingsProfile';
import SettingsInvite from './SettingsInvite';
import SettingsGroup from './SettingsGroup';
import SettingsCatalog from './SettingsCatalog';
import PaymentMethodsList from './PaymentMethodsList'; // <-- Import

const TABS = [
    { id: "profile", label: "Profile" },
    { id: "invite", label: "Invite User" },
    { id: "group", label: "Group Info" },
    { id: "catalog", label: "Catalog" },
    { id: "payment", label: "Payment Methods" }, // <-- Add Payment Methods tab
];

const Settings = ({ onBack, showNotification, userProfile }) => {
    const [activeTab, setActiveTab] = useState("profile");

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
                    <button onClick={onBack} className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                        &larr; Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">App Settings</h1>
                </div>
            </header>

            {/* TABS */}
            <div className="max-w-7xl mx-auto py-4 px-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`px-4 py-2 font-semibold rounded-t ${
                            activeTab === tab.id
                                ? "bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
                    <PaymentMethodsList userProfile={userProfile} />
                )}
            </main>
        </div>
    );
};

export default Settings;