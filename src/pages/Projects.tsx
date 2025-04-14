import { MagnifyingGlassIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";

export default function Projects() {
  const projects = [
    {
      title: "Project Alpha",
      author: "John Doe",
      stats: {
        tasks: 12,
        teams: 3,
        projects: 1,
      },
    },
    {
      title: "Project Beta",
      author: "Jane Smith",
      stats: {
        tasks: 8,
        teams: 2,
        projects: 1,
      },
    },
    {
      title: "Project Gamma",
      author: "Mike Johnson",
      stats: {
        tasks: 15,
        teams: 4,
        projects: 1,
      },
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-[1024px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center rounded-lg bg-white px-4 py-2 shadow-sm">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                className="ml-2 border-none bg-transparent outline-none"
              />
            </div>
            <button className="flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white">
              <span>+ Project</span>
            </button>
          </div>
        </div>

        <div className="mb-6 flex space-x-4">
          <button className="border-b-2 border-primary-600 pb-2 text-sm font-medium text-gray-900">
            Active
          </button>
          <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-900">
            Inactive
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group relative rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-8 w-8 rounded-full bg-gray-200">
                  <span className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-600">
                    {project.title.charAt(0)}
                  </span>
                </div>
                <ArrowUpRightIcon className="h-5 w-5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <h3 className="mb-4 text-lg font-medium text-gray-900">{project.title}</h3>
              <p className="text-sm text-gray-500">{project.author}</p>
              <div className="mt-4 flex space-x-4">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{project.stats.tasks}</span>
                  <span className="ml-1 text-sm text-gray-500">Tasks</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{project.stats.teams}</span>
                  <span className="ml-1 text-sm text-gray-500">Teams</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{project.stats.projects}</span>
                  <span className="ml-1 text-sm text-gray-500">Projects</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
