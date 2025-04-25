import { SignUp as ClerkSignUp } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

const SignUp = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        
        <ClerkSignUp 
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/"
          appearance={{
            elements: {
              rootBox: "w-full mx-auto",
              card: "shadow-none border-0 p-0",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm font-medium py-2",
              footerActionLink: "text-indigo-600 hover:text-indigo-500"
            }
          }}
        />
      </div>
    </div>
  )
}

export default SignUp 