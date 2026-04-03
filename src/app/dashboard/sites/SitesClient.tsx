'use client'

import { useState } from 'react'
import { createSite, updateSite, deleteSite } from './actions'
import { Building2, Plus, MapPin, Edit, Trash2, X } from 'lucide-react'

type Site = {
  id: string
  name: string
  location: string | null
  description: string | null
  created_at: string
}

type Props = {
  sites: Site[]
  userRole: string
}

export default function SitesClient({ sites, userRole }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const canEdit = userRole === 'Master' || userRole === 'Operator'
  const canDelete = userRole === 'Master'

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const result = editingSite
      ? await updateSite(editingSite.id, formData)
      : await createSite(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
      setIsModalOpen(false)
      setEditingSite(null)
      const form = document.querySelector('form') as HTMLFormElement
      form?.reset()
    }
  }

  async function handleDelete(siteId: string) {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await deleteSite(siteId)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  function openCreateModal() {
    setEditingSite(null)
    setError(null)
    setSuccess(false)
    setIsModalOpen(true)
  }

  function openEditModal(site: Site) {
    setEditingSite(site)
    setError(null)
    setSuccess(false)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingSite(null)
    setError(null)
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sites</h1>
            <p className="text-gray-600">
              Manage all construction sites for your organization
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add New Site
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Operation completed successfully!
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Sites Grid */}
      <div className="max-w-7xl mx-auto">
        {sites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No sites yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by adding your first construction site
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add New Site
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {site.name}
                      </h3>
                      {site.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="w-4 h-4" />
                          {site.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {site.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {site.description}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  {canEdit && (
                    <button
                      onClick={() => openEditModal(site)}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(site.id)}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSite ? 'Edit Site' : 'Add New Site'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form action={handleSubmit} className="p-6 space-y-6">
              {/* Site Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  disabled={isLoading}
                  defaultValue={editingSite?.name || ''}
                  className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none text-gray-900 placeholder:text-gray-400 transition-all disabled:bg-gray-50"
                  placeholder="e.g., Downtown Tower Project"
                />
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  disabled={isLoading}
                  defaultValue={editingSite?.location || ''}
                  className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none text-gray-900 placeholder:text-gray-400 transition-all disabled:bg-gray-50"
                  placeholder="e.g., Bangalore, Karnataka"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  disabled={isLoading}
                  defaultValue={editingSite?.description || ''}
                  className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none resize-none text-gray-900 placeholder:text-gray-400 transition-all disabled:bg-gray-50"
                  placeholder="Add any additional details about this site..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isLoading
                    ? 'Saving...'
                    : editingSite
                    ? 'Update Site'
                    : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}