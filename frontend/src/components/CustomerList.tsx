import { CaretDown, Link, Funnel } from '@phosphor-icons/react'

const CustomerList = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Company: Current customers
            <CaretDown className="ml-2 h-4 w-4" />
          </button>
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Owner: My portfolio
            <CaretDown className="ml-2 h-4 w-4" />
          </button>
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Funnel className="mr-2 h-4 w-4" />
            Add filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden border border-gray-300">
        <div className="min-w-full divide-y divide-gray-300">
          <div className="bg-gray-50 px-6 py-3">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">EMEA</h3>
                <p className="mt-1 text-sm text-gray-500">4 companies</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Sum: 200,150</p>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-300">
            {[
              {
                logo: "A",
                name: "Allegro",
                owner: { name: "Tobias", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
                arr: "23,200",
                score: 4
              },
              {
                logo: "D",
                name: "Dufry",
                owner: { name: "Sophia", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
                arr: "62,780",
                score: 3
              }
            ].map((company, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                      {company.logo}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{company.name}</h4>
                        <Link className="ml-2 h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <img
                            className="h-6 w-6 rounded-full"
                            src={company.owner.avatar}
                            alt={company.owner.name}
                          />
                          <span className="ml-2 text-sm text-gray-500">{company.owner.name}</span>
                        </div>
                        <div className="w-24 text-right">
                          <span className="text-sm text-gray-900">{company.arr}</span>
                        </div>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-2 w-2 rounded-full mx-0.5 ${
                                i < company.score ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerList 