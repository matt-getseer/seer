import { CreateOrganization as ClerkCreateOrganization } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

const CreateOrganization = () => {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Create New Organization</h1>
      <div className="bg-white rounded-lg shadow">
        <ClerkCreateOrganization 
          afterCreateOrganizationUrl="/organizations/:id"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-0",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm font-medium py-2",
              formFieldInput: "rounded-md border-gray-300",
              formFieldLabel: "text-gray-700",
            }
          }}
        />
      </div>
    </div>
  )
}

export default CreateOrganization 