import { useOrganization } from '@clerk/clerk-react'
import { useState } from 'react'

const OrganizationSettings = () => {
  const { organization } = useOrganization()
  const [organizationName, setOrganizationName] = useState(organization?.name || '')

  if (!organization) {
    return <div>Loading...</div>
  }

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await organization.update({ name: organizationName })
      // You might want to show a success message here
    } catch (error) {
      console.error('Failed to update organization:', error)
      // You might want to show an error message here
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleUpdateOrganization}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Delete Organization</h4>
                    <p className="mt-1 text-sm text-red-700">
                      Once you delete an organization, there is no going back. Please be certain.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
                        organization.destroy()
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    Delete Organization
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OrganizationSettings 