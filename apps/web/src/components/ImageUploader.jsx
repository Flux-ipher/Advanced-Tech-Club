import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  AlertTriangle,
  CheckCircle2,
  Camera,
  RefreshCw,
  Link2
} from 'lucide-react';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif'
];

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * ImageUploader Component
 * Dual-method image uploader supporting direct device files (browse/drag-and-drop),
 * direct web image URLs, and curated preset banners.
 *
 * @param {string} value - Current image URL / Data URL
 * @param {function} onChange - Callback receiving the new image data URL or empty string
 * @param {'banner' | 'avatar' | 'card'} mode - Layout style for uploader
 * @param {string} label - Input label
 * @param {string} helperText - Descriptive guidance
 * @param {string[]} presets - Optional preset image URLs to choose from
 */
export function ImageUploader({
  value = '',
  onChange,
  mode = 'banner',
  label = 'Upload Image',
  helperText = 'PNG, JPG, WEBP, or GIF up to 5MB. Only image files are permitted.',
  presets = []
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadMethod, setUploadMethod] = useState('device'); // 'device' | 'url'
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;

    // 1. Strict MIME type check
    const isImageMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith('image/');
    
    // 2. Extension check
    const lowerName = file.name.toLowerCase();
    const hasImageExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    if (!isImageMime || !hasImageExt) {
      setError(`Invalid file type "${file.name}". Only images (PNG, JPG, WEBP, GIF) are allowed. Other file types are strictly prohibited.`);
      return false;
    }

    // 3. File size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
      return false;
    }

    setError('');
    return true;
  };

  const handleProcessFile = (file) => {
    if (!validateFile(file)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      if (onChange) onChange(result);
    };
    reader.onerror = () => {
      setError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = () => {
    setFileName('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onChange) onChange('');
  };

  // AVATAR MODE (Profile pictures)
  if (mode === 'avatar') {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-bold uppercase text-neutral-700">
            {label}
          </label>
        )}

        <div className="flex items-center gap-4">
          {/* Avatar Preview with Camera overlay button */}
          <div className="relative group shrink-0">
            <img
              src={value || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
              alt="Avatar Preview"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-neutral-200 shadow-sm"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-neutral-900/60 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[10px] font-semibold"
              title="Click to upload profile picture"
            >
              <Camera className="w-5 h-5" />
              <span>Upload</span>
            </button>
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload New Image
              </button>

              {value && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-2.5 py-1.5 text-xs text-danger-600 hover:text-danger-800 hover:bg-danger-50 rounded-lg transition-colors font-semibold"
                >
                  Reset
                </button>
              )}
            </div>

            <p className="text-[11px] text-neutral-500">
              {fileName ? `Selected: ${fileName}` : helperText}
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="p-2.5 bg-danger-50 border border-danger-200 text-danger-700 text-xs rounded-lg flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // BANNER & CARD MODE (Event Banners, Announcement Media)
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold uppercase text-neutral-700">
          {label}
        </label>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        /* Image Preview with Replace / Remove controls */
        <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 group shadow-sm">
          <img
            src={value}
            alt="Uploaded Preview"
            className="w-full h-48 sm:h-56 object-cover transition-opacity group-hover:opacity-90"
          />

          {/* Action Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-900 text-white text-xs font-semibold backdrop-blur-md transition-colors flex items-center gap-1.5 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Replace Image
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg bg-danger-600/90 hover:bg-danger-600 text-white backdrop-blur-md transition-colors shadow"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-3 left-3 bg-neutral-950/70 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-medium text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success-400" />
            <span>{fileName || 'Image Ready'}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Method Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
            <button
              type="button"
              onClick={() => {
                setUploadMethod('device');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                uploadMethod === 'device'
                  ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload from Device</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUploadMethod('url');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                uploadMethod === 'url'
                  ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Paste Image URL</span>
            </button>
          </div>

          {uploadMethod === 'device' ? (
            /* Drag and Drop Upload Zone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 ${
                dragOver
                  ? 'border-primary-500 bg-primary-50/50'
                  : 'border-neutral-300 hover:border-primary-400 bg-neutral-50/50 hover:bg-neutral-50'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>

              <p className="text-sm font-bold text-neutral-800">
                Click to browse device files or drag & drop image
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {helperText}
              </p>

              <span className="inline-block mt-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                Images Only (PNG, JPG, WEBP, GIF up to 5MB)
              </span>
            </div>
          ) : (
            /* Direct URL Input Zone */
            <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-2">
              <label className="block text-xs font-semibold text-neutral-700">
                Direct Web Image URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or image link"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customUrl.trim()) {
                        setError('');
                        setFileName('Image from URL');
                        if (onChange) onChange(customUrl.trim());
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customUrl.trim()) {
                      setError('Please enter a valid image URL.');
                      return;
                    }
                    setError('');
                    setFileName('Image from URL');
                    if (onChange) onChange(customUrl.trim());
                  }}
                  className="btn-primary text-xs py-2 px-4 shrink-0 font-semibold"
                >
                  Apply URL
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                Paste any publicly accessible image link (Unsplash, Imgur, Supabase, Cloudinary, etc.)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preset Banners (Fast Admin Picker) */}
      {presets.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-semibold text-neutral-500 mb-1.5">
            Or choose a curated campus tech banner:
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {presets.map((presetUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setError('');
                  setFileName(`Preset Tech Banner ${idx + 1}`);
                  if (onChange) onChange(presetUrl);
                }}
                className={`relative rounded-lg overflow-hidden border-2 h-14 group transition-all ${
                  value === presetUrl ? 'border-primary-500 ring-2 ring-primary-100' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <img
                  src={presetUrl}
                  alt={`Preset ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
