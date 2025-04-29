import { useOrganization } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'
import type { OrganizationMembershipResource } from '@clerk/types'

const OrganizationMembers = () => {
  const { organization } = useOrganization()
  const [inviteEmail, setInviteEmail] = useState('')
  const [members, setMembers] = useState<OrganizationMembershipResource[]>([])

  useEffect(() => {
    if (organization) {
      organization.getMemberships().then(response => setMembers(response.data))
    }
  }, [organization])

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await organization?.inviteMember({ 
        emailAddress: inviteEmail,
        role: 'basic_member'
      })
      setInviteEmail('')
      const response = await organization?.getMemberships()
      setMembers(response?.data || [])
    } catch (error) {
      console.error('Failed to invite member:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Organization Members</h1>
      </div>

      {/* Invite Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New Member</h3>
        <form onSubmit={handleInviteMember} className="flex gap-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Send Invite
          </button>
        </form>
      </div>

      {/* Members List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {member.publicUserData?.imageUrl ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={member.publicUserData.imageUrl}
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">
                            {member.publicUserData?.firstName?.[0] || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {member.publicUserData?.firstName} {member.publicUserData?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.publicUserData?.identifier}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {member.role !== 'admin' && (
                    <button
                      onClick={() => organization.removeMember(member.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default OrganizationMembers 