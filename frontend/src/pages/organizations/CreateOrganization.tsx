import { CreateOrganization as ClerkCreateOrganization } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

const CreateOrganization = () => {
  const navigate = useNavigate()

  return (
    // Removed the outer div with max-w-4xl and py-10 for consistency with MinimalLayout
    // <div className="max-w-4xl mx-auto py-10">
      // Removed the H1 title
      // <h1 className="text-2xl font-bold mb-8">Create New Organization</h1>
      // Removed the inner div wrapper
      // <div className="bg-white rounded-lg shadow">
        <ClerkCreateOrganization 
          afterCreateOrganizationUrl="/"
          appearance={{
            elements: {
              // Allow the Clerk component to control its width and appearance fully
              // rootBox: "w-full", 
              // card: "shadow-none border-0", 
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm font-medium py-2",
              formFieldInput: "rounded-md border-gray-300",
              formFieldLabel: "text-gray-700",
            }
          }}
        />
      // </div>
    // </div>
  )
}

export default CreateOrganization 