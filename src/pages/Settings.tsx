import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, KeyIcon, UserCircleIcon, SwatchIcon } from '@heroicons/react/24/outline';
import { useLogoUpload } from '../hooks/useLogoUpload';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import usePageTitle from '../hooks/usePageTitle';

interface SettingsSection {
  id: string;
  name: string;
  icon: React.ForwardRefExoticComponent<any>;
}

interface ProfileFormData {
  full_name: string;
  username: string;
  bio: string;
  logo_url: string | null;
  brand_name: string;
  primary_color: string;
  secondary_color: string;
  brand_font: string;
}

const Settings: React.FC = () => {
  usePageTitle('Settings');
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadLogo, isUploading, error: uploadError } = useLogoUpload();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    username: '',
    bio: '',
    logo_url: null,
    brand_name: '',
    primary_color: '#4F46E5',
    secondary_color: '#9333EA',
    brand_font: 'Inter'
  });

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (!error && data) {
        setFormData(prevData => ({
          ...prevData,
          ...data,
          logo_url: data.logo_url
        }));
        setLogoUrl(data.logo_url);
      }
    };

    fetchProfileData();
  }, [user?.id]);

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/" />;
  }

  const sections: SettingsSection[] = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'branding', name: 'Branding', icon: SwatchIcon },
  ];

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const result = await uploadLogo(file);
    if ('url' in result) {
      setLogoUrl(result.url);
      setFormData(prev => ({
        ...prev,
        logo_url: result.url
      }));
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Show success message or notification here if needed
    } catch (error) {
      console.error('Error saving changes:', error);
      // Show error message to user if needed
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={formData.username || ''}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="johndoe"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Write a few sentences about yourself"
              />
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">Receive email updates about your account</p>
              </div>
              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                <p className="text-sm text-gray-500">Receive push notifications on your device</p>
              </div>
              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
              </button>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <button className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                Update Password
              </button>
            </div>
          </div>
        );
      case 'branding':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Brand Identity</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Logo</label>
                  <div className="mt-2 flex items-center space-x-6">
                    <div 
                      className="h-16 w-16 rounded border border-gray-300 flex items-center justify-center overflow-hidden"
                    >
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Company logo" 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-gray-400">No logo</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                      <button
                        onClick={handleLogoClick}
                        disabled={isUploading}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? 'Uploading...' : 'Upload Logo'}
                      </button>
                    </div>
                  </div>
                  {uploadError && (
                    <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Recommended size: 400x400px. Max file size: 2MB.
                  </p>
                </div>

                <div>
                  <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    id="brand-name"
                    value={formData.brand_name || ''}
                    onChange={(e) => handleInputChange('brand_name', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand Colors</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="primary-color" className="block text-xs text-gray-500 mb-1">
                        Primary Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          id="primary-color"
                          value={formData.primary_color}
                          onChange={(e) => handleInputChange('primary_color', e.target.value)}
                          className="h-8 w-8 rounded-md border border-gray-300 p-0"
                        />
                        <input
                          type="text"
                          value={formData.primary_color}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          readOnly
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="secondary-color" className="block text-xs text-gray-500 mb-1">
                        Secondary Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          id="secondary-color"
                          value={formData.secondary_color}
                          onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                          className="h-8 w-8 rounded-md border border-gray-300 p-0"
                        />
                        <input
                          type="text"
                          value={formData.secondary_color}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="brand-font" className="block text-sm font-medium text-gray-700">
                    Brand Font
                  </label>
                  <select
                    id="brand-font"
                    value={formData.brand_font}
                    onChange={(e) => handleInputChange('brand_font', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option>Inter</option>
                    <option>Roboto</option>
                    <option>Open Sans</option>
                    <option>Lato</option>
                    <option>Poppins</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={async () => {
                  if (user?.id) {
                    const { error } = await supabase
                      .from('profiles')
                      .update({ logo_url: null })
                      .eq('id', user.id);
                    
                    if (!error) {
                      setLogoUrl(null);
                      setFormData(prev => ({
                        ...prev,
                        logo_url: null
                      }));
                    }
                  }
                }}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Reset to Default
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-3">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium ${
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-900 hover:bg-gray-50'
                }`}
              >
                <section.icon
                  className={`mr-3 h-5 w-5 ${
                    activeSection === section.id ? 'text-primary-600' : 'text-gray-400'
                  }`}
                />
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="col-span-9">
          <div className="rounded-lg bg-white p-6 shadow-sm">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 
