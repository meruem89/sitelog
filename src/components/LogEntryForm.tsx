'use client'

import { useEffect, useState } from 'react'
import { createLogEntry } from '@/app/dashboard/logs/actions'
import { analyzeBillImage } from '@/app/dashboard/logs/ocrAction'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const logTypes = ['Material', 'Labour', 'Service'] as const

export default function LogEntryForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [ocrInfo, setOcrInfo] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [isSitesLoading, setIsSitesLoading] = useState(true)
  const [siteFetchError, setSiteFetchError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Fetch user role and tenant_id
    supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
      if (userError || !user) {
        setRoleLoading(false)
        return
      }

      supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()
        .then(({ data: profile, error: profileError }) => {
          if (profileError || !profile) {
            setError('Failed to load user profile')
            setRoleLoading(false)
            return
          }

          setUserRole(profile.role)
          setRoleLoading(false)

          // Fetch sites for the user's tenant
          if (profile.tenant_id) {
            supabase
              .from('sites')
              .select('id, name')
              .eq('tenant_id', profile.tenant_id)
              .order('name')
              .then(({ data, error }) => {
                if (error) {
                  setSiteFetchError('Failed to load sites')
                } else {
                  setSites(data || [])
                }
              })
              .finally(() => setIsSitesLoading(false))
          } else {
            setSiteFetchError('Account not associated with a tenant')
            setIsSitesLoading(false)
          }
        })
    })
  }, [])

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (!formData.get('site_id')) {
      setError('Please select a site')
      setIsLoading(false)
      return
    }

    const result = await createLogEntry(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
      setFileName(null)
      // Reset form
      const form = document.querySelector('form') as HTMLFormElement
      form?.reset()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    
    if (!file) {
      setFileName(null)
      return
    }

    setFileName(file.name)
    setIsAnalyzing(true)
    setOcrInfo(null)
    setError(null)

    try {
      // Convert and compress image to base64
      const reader = new FileReader()
      
      reader.onloadend = async () => {
        const img = new Image()
        
        img.onload = async () => {
          // Create canvas to compress image
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Calculate new dimensions (max 1500px width/height to reduce size)
          let width = img.width
          let height = img.height
          const maxSize = 1500
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize
              width = maxSize
            } else {
              width = (width / height) * maxSize
              height = maxSize
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height)
          
          // Convert to base64 with compression (0.7 quality for JPEG)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)

          // Call OCR action
          const result = await analyzeBillImage(compressedBase64)

          if (result.error) {
            setOcrInfo(`OCR Warning: ${result.error}`)
            setIsAnalyzing(false)
            return
          }

          // Auto-fill the form fields
          const form = document.querySelector('form') as HTMLFormElement
          
          if (result.vendorName) {
            const descriptionField = form.querySelector('#description') as HTMLTextAreaElement
            if (descriptionField && !descriptionField.value) {
              descriptionField.value = result.vendorName
            }
          }

          if (result.totalAmount) {
            const costField = form.querySelector('#cost') as HTMLInputElement
            if (costField) {
              costField.value = result.totalAmount.toString()
            }
          }

          setOcrInfo(
            `✓ Extracted: ${result.vendorName || 'No vendor'} | Amount: ₹${result.totalAmount || 'N/A'}`
          )
          setIsAnalyzing(false)
        }
        
        img.onerror = () => {
          setOcrInfo('Failed to load image')
          setIsAnalyzing(false)
        }
        
        img.src = reader.result as string
      }

      reader.onerror = () => {
        setOcrInfo('Failed to read file')
        setIsAnalyzing(false)
      }

      reader.readAsDataURL(file)
    } catch (err) {
      setOcrInfo('Failed to analyze image')
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto hover:shadow-md transition-shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Log Entry</h2>

      {roleLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : userRole === 'Viewer' ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          <p className="font-semibold mb-1">View-Only Access</p>
          <p>You have Viewer permissions and cannot create log entries. Please contact your administrator if you need Operator access.</p>
        </div>
      ) : (
        {/* Type Dropdown */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-900 mb-2">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none bg-white text-gray-900 transition-all"
          >
            <option value="">Select type...</option>
            {logTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none resize-none text-gray-900 placeholder:text-gray-400 transition-all"
            placeholder="Enter detailed description..."
          />
        </div>

        {/* Site Selection */}
        <div>
          <label htmlFor="site_id" className="block text-sm font-medium text-gray-900 mb-2">
            Site <span className="text-red-500">*</span>
          </label>
          <select
            id="site_id"
            name="site_id"
            required
            disabled={isSitesLoading || !sites.length}
            className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none bg-white text-gray-900 transition-all disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="">{isSitesLoading ? 'Loading sites...' : 'Select site...'}</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          {siteFetchError && <p className="text-sm text-red-600 mt-2">{siteFetchError}</p>}
          {!isSitesLoading && !sites.length && !siteFetchError && (
            <p className="text-sm text-gray-500 mt-2">No sites found. Add a site first.</p>
          )}
        </div>

        {/* Cost */}
        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-900 mb-2">
            Cost (₹) <span className="text-red-500">*</span>
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none text-gray-900 placeholder:text-gray-400 transition-all"
            placeholder="0.00"
          />
        </div>

        {/* File Upload */}
        <div>
          <label htmlFor="bill_image" className="block text-sm font-medium text-gray-900 mb-2">
            Bill Image {isAnalyzing && <span className="text-indigo-600">(Analyzing...)</span>}
          </label>
          <div className="relative">
            <input
              id="bill_image"
              name="bill_image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isAnalyzing}
              className="hidden"
            />
            <label
              htmlFor="bill_image"
              className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg transition-all ${
                isAnalyzing
                  ? 'border-gray-200 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer'
              }`}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-gray-500">
                {fileName || 'Click to upload bill image'}
              </span>
            </label>
          </div>
          {fileName && !isAnalyzing && (
            <p className="mt-2 text-sm text-green-600 font-medium">Selected: {fileName}</p>
          )}
          {ocrInfo && (
            <p className="mt-2 text-sm text-indigo-600 font-medium">{ocrInfo}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Log entry created successfully!
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6"
        >
          {isLoading ? 'Saving...' : 'Add Log Entry'}
        </button>
      </form>
      )}
    </div>
  )
}
