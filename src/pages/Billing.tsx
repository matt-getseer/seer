import React from 'react';
import { ArrowUpRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface BillingItem {
  title: string;
  author: string;
  stats: {
    tasks: number;
    members: number;
    amount: number;
  };
}

const Billing: React.FC = () => {
  const billingItems: BillingItem[] = [
    {
      title: 'Q1 2024 Enterprise License',
      author: 'Matt Stevenson',
      stats: { tasks: 4, members: 15, amount: 2500 },
    },
    {
      title: 'Team Collaboration Add-on',
      author: 'Matt Stevenson',
      stats: { tasks: 2, members: 8, amount: 800 },
    },
    {
      title: 'Premium Support Package',
      author: 'Matt Stevenson',
      stats: { tasks: 1, members: 3, amount: 500 },
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-[1024px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center rounded-lg bg-white px-4 py-2 shadow-sm">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                className="ml-2 border-none bg-transparent outline-none"
              />
            </div>
            <button className="flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white">
              <span>+ Invoice</span>
            </button>
          </div>
        </div>

        <div className="mb-6 flex space-x-4">
          <button className="border-b-2 border-primary-600 pb-2 text-sm font-medium text-gray-900">
            Current
          </button>
          <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-900">
            History
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {billingItems.map((item, index) => (
            <div
              key={index}
              className="group relative rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-8 w-8 rounded-full bg-gray-200">
                  <span className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-600">
                    MS
                  </span>
                </div>
                <ArrowUpRightIcon className="h-5 w-5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <h3 className="mb-4 text-lg font-medium text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.author}</p>
              <div className="mt-4 flex space-x-4">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">${item.stats.amount}</span>
                  <span className="ml-1 text-sm text-gray-500">USD</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{item.stats.members}</span>
                  <span className="ml-1 text-sm text-gray-500">Users</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{item.stats.tasks}</span>
                  <span className="ml-1 text-sm text-gray-500">Items</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Billing; 
