import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseLogoUploadReturn {
  uploadLogo: (file: File) => Promise<{ url: string } | { error: string }>;
  isUploading: boolean;
  error: string | null;
}

export const useLogoUpload = (): UseLogoUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadLogo = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      if (!data) {
        throw new Error('Upload failed');
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      if (!publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return { url: publicUrlData.publicUrl };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload logo';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadLogo, isUploading, error };
}; 