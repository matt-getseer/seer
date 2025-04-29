import { useOrganization } from '@clerk/clerk-react'
import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

const OrganizationProfile = () => {
  const { orgId } = useParams()
  const { organization } = useOrganization()
  const [membership, setMembership] = useState<any>(null)

  useEffect(() => {
    if (organization) {
      // Get the current user's membership
      organization.getMemberships().then(memberships => {
        const currentUserMembership = memberships.data[0]
        setMembership(currentUserMembership)
      })
    }
  }, [organization])

  if (!organization || !membership) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        <div className="space-x-4">
          <Link 
            to={`/organizations/${orgId}/settings`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Settings
          </Link>
          <Link 
            to={`/organizations/${orgId}/members`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Manage Members
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(organization.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Membership</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Your Role</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {membership.role}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Joined</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(membership.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrganizationProfile 