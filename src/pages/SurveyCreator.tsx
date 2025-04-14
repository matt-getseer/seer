import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyContext } from '../contexts/SurveyContext';
import { useAuth } from '../contexts/AuthContext';
import usePageTitle from '../hooks/usePageTitle';
import Input from '../components/Input';

const SurveyCreator: React.FC = () => {
  usePageTitle('Create Survey');
  const navigate = useNavigate();
  const { addSurvey } = useSurveyContext();
  const { user } = useAuth();
  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    question1: '',
    question2: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSurveyDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSurveyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newSurvey = {
        title: surveyData.title,
        description: surveyData.description,
        author: user?.user_metadata?.full_name || user?.email || 'Anonymous',
        questions: [
          {
            question: surveyData.question1,
            type: "text" as const,
            required: true,
            order_number: 1
          },
          {
            question: surveyData.question2,
            type: "text" as const,
            required: true,
            order_number: 2
          }
        ]
      };

      await addSurvey(newSurvey);
      navigate('/surveys');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Survey</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="title"
          name="title"
          label="Survey Title"
          value={surveyData.title}
          onChange={handleSurveyDataChange}
          required
        />

        <Input
          id="description"
          name="description"
          label="Description"
          value={surveyData.description}
          onChange={handleSurveyDataChange}
          multiline
          rows={4}
        />

        <Input
          id="question1"
          name="question1"
          label="First Question"
          value={surveyData.question1}
          onChange={handleSurveyDataChange}
          required
          placeholder="Enter your first question"
        />

        <Input
          id="question2"
          name="question2"
          label="Second Question"
          value={surveyData.question2}
          onChange={handleSurveyDataChange}
          required
          placeholder="Enter your second question"
        />

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Survey'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurveyCreator; 
