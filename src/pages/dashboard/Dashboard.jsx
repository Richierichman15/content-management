import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  PhotoIcon,
  TagIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch dashboard stats');
      }

      setStats(data.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const statCards = [
    {
      title: 'Total Content',
      value: stats?.totalContent || 0,
      icon: DocumentTextIcon,
      link: '/content',
      color: 'bg-blue-500',
    },
    {
      title: 'Media Files',
      value: stats?.totalMedia || 0,
      icon: PhotoIcon,
      link: '/media',
      color: 'bg-green-500',
    },
    {
      title: 'Categories',
      value: stats?.totalCategories || 0,
      icon: TagIcon,
      link: '/categories',
      color: 'bg-yellow-500',
    },
    {
      title: 'Users',
      value: stats?.totalUsers || 0,
      icon: UserGroupIcon,
      link: '/users',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Overview of your content management system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <card.icon
                    className={`h-6 w-6 ${card.color.replace(
                      'bg-',
                      'text-'
                    )}`}
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {card.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h2>
          {stats?.recentActivity?.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {stats.recentActivity.map((activity, index) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {index !== stats.recentActivity.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              activity.type === 'create'
                                ? 'bg-green-500'
                                : activity.type === 'update'
                                ? 'bg-blue-500'
                                : 'bg-red-500'
                            }`}
                          >
                            <DocumentTextIcon
                              className="h-5 w-5 text-white"
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              {activity.description}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time dateTime={activity.date}>
                              {new Date(activity.date).toLocaleDateString()}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/content/new"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Content
            </Link>
            <Link
              to="/media"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Upload Media
            </Link>
            <Link
              to="/categories"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Manage Categories
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 